import { NextRequest, NextResponse } from 'next/server';

interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

interface GenerateStepsRequest {
  task: string;
  userInput?: string;
  existingSteps: TaskStep[];
  chatHistory: string[];
}

interface GenerateStepsResponse {
  steps: TaskStep[];
}

export async function POST(request: NextRequest) {
  try {
    const { task, userInput, existingSteps, chatHistory }: GenerateStepsRequest = await request.json();
    
    // Get API key from environment
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DeepSeek API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the context for direct step generation
    const context = buildDirectStepGenerationContext(task, userInput || '', existingSteps, chatHistory);
    
    // Call DeepSeek API
    const aiResponse = await callDeepSeekAPI(apiKey, context);
    
    // Parse the AI response to extract steps
    const parsedSteps = parseStepsFromAIResponse(aiResponse, existingSteps);
    
    return NextResponse.json({
      steps: parsedSteps
    });

  } catch (error) {
    console.error('Generate Steps error:', error);
    return NextResponse.json(
      { error: 'Failed to generate steps' },
      { status: 500 }
    );
  }
}

function buildDirectStepGenerationContext(
  task: string, 
  userInput: string,
  existingSteps: TaskStep[], 
  chatHistory: string[]
): string {
  let context = `You are a task planning assistant. Based on the conversation history, generate direct action steps for the task: "${task}".

`;

  if (userInput) {
    context += `Additional user requirements: ${userInput}\n\n`;
  }

  if (chatHistory.length > 0) {
    context += `Conversation context:\n${chatHistory.slice(-10).join('\n')}\n\n`;
  }

  if (existingSteps.length > 0) {
    context += `Current steps for this task:\n${existingSteps.map(step => 
      `- ${step.text} ${step.completed ? '(completed)' : '(pending)'}`
    ).join('\n')}\n\n`;
  }

  context += `IMPORTANT: Generate action steps directly without asking questions or providing explanations.
Just provide the list of action steps in this exact format:

STEPS_START
- [Step description 1]
- [Step description 2]
- [Step description 3]
STEPS_END

Rules:
- Create 3-7 actionable, specific steps
- Make steps sequential and logical
- Keep each step concise and clear
- If modifying existing steps, maintain completed status where appropriate
- Do not include any text before or after the STEPS_START/STEPS_END markers`;

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
          content: 'You are a task planning assistant. Generate direct action steps without asking questions.'
        },
        {
          role: 'user',
          content: context
        }
      ],
      max_tokens: 800,
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
