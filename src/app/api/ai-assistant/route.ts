import { NextRequest, NextResponse } from 'next/server';

interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

interface AIRequest {
  task: string;
  userInput: string;
  existingSteps: TaskStep[];
  chatHistory: string[];
}

interface AIResponse {
  steps: TaskStep[];
  response: string;
}

export async function POST(request: NextRequest) {
  try {
    const { task, userInput, existingSteps, chatHistory }: AIRequest = await request.json();
    
    // Get API key from environment
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the conversation context
    const context = buildContext(task, userInput, existingSteps, chatHistory);
    
    // Call DeepSeek API
    const aiResponse = await callDeepSeekAPI(apiKey, context);
    
    // Parse the AI response to extract steps
    const parsedSteps = parseStepsFromAIResponse(aiResponse, existingSteps);
    
    return NextResponse.json({
      steps: parsedSteps,
      response: aiResponse
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

function buildContext(
  task: string, 
  userInput: string, 
  existingSteps: TaskStep[], 
  chatHistory: string[]
): string {
  let context = `You are a helpful task planning assistant. The user has a task: "${task}".

The user says: "${userInput}"

`;

  if (existingSteps.length > 0) {
    context += `Current steps for this task:\n${existingSteps.map(step => 
      `- ${step.text} ${step.completed ? '(completed)' : '(pending)'}`
    ).join('\n')}\n\n`;
  }

  if (chatHistory.length > 0) {
    context += `Previous conversation:\n${chatHistory.slice(-4).join('\n')}\n\n`;
  }

  context += `Please provide a helpful response and create/modify action steps for this task. 
IMPORTANT: If you need more details to create proper steps, ask clarifying questions first before providing steps.

Format your response as follows:

1. First, provide a helpful response to the user's input
2. If you need more information, ask specific clarifying questions
3. If you have enough information, provide a list of action steps in this exact format:
   STEPS_START
   - [Step description 1]
   - [Step description 2]
   - [Step description 3]
   STEPS_END

Important rules:
- Be interactive - ask questions when you need clarification
- Keep steps actionable and specific
- If modifying existing steps, maintain completed status where appropriate
- Create 3-7 steps depending on complexity
- Make steps sequential and logical
- Each step should be a single actionable item
- If you're asking questions, don't provide steps yet`;

  return context;
}

async function callDeepSeekAPI(apiKey: string, context: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful task planning assistant. Help users break down tasks into actionable steps.'
        },
        {
          role: 'user',
          content: context
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from AI';
}

function parseStepsFromAIResponse(aiResponse: string, existingSteps: TaskStep[]): TaskStep[] {
  try {
    // Check if the AI is asking questions (contains question marks and doesn't provide steps)
    const isAskingQuestions = aiResponse.includes('?') && !aiResponse.includes('STEPS_START');
    
    if (isAskingQuestions) {
      // If AI is asking questions, don't update steps yet
      return existingSteps;
    }

    // Extract steps from the AI response
    const stepsMatch = aiResponse.match(/STEPS_START\n([\s\S]*?)\nSTEPS_END/);
    if (!stepsMatch) {
      // If no specific format found, try to extract bullet points
      const bulletMatches = aiResponse.match(/-\s*\[?(.*?)\]?(?=\n-|\n\n|$)/g);
      if (bulletMatches) {
        return bulletMatches.map((bullet, index) => ({
          id: `step-${Date.now()}-${index}`,
          text: bullet.replace(/^-\s*\[?(.*?)\]?$/, '$1').trim(),
          completed: false
        }));
      }
      return existingSteps; // Return existing steps if no new ones found
    }

    const stepsText = stepsMatch[1];
    const stepLines = stepsText.split('\n').filter(line => line.trim().startsWith('-'));
    
    const newSteps = stepLines.map((line, index) => {
      const stepText = line.replace(/^-\s*\[?(.*?)\]?$/, '$1').trim();
      
      // Try to match with existing steps to preserve completion status
      const existingStep = existingSteps.find(step => 
        step.text.toLowerCase() === stepText.toLowerCase() ||
        stepText.toLowerCase().includes(step.text.toLowerCase())
      );

      return {
        id: existingStep?.id || `step-${Date.now()}-${index}`,
        text: stepText,
        completed: existingStep?.completed || false
      };
    });

    return newSteps.length > 0 ? newSteps : existingSteps;
  } catch (error) {
    console.error('Error parsing AI steps:', error);
    return existingSteps;
  }
}
