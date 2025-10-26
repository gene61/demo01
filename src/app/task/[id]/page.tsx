'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  deadline?: Date;
  steps: TaskStep[];
  aiChatHistory: string[];
}

// Helper function to format date in Perth timezone
const formatPerthTime = (date: Date) => {
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export default function TaskDetail() {
  const params = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [showGenerateStepsModal, setShowGenerateStepsModal] = useState(false);
  const [generateStepsInput, setGenerateStepsInput] = useState('');
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [forceSteps, setForceSteps] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id) {
      const savedTasks = localStorage.getItem('todos');
      if (savedTasks) {
        const tasks: Task[] = JSON.parse(savedTasks);
        const foundTask = tasks.find(t => t.id === params.id);
        if (foundTask) {
          // Ensure the task has the new properties
          const enhancedTask: Task = {
            ...foundTask,
            steps: foundTask.steps || [],
            aiChatHistory: foundTask.aiChatHistory || []
          };
          setTask(enhancedTask);
        }
      }
    }
  }, [params.id]);

  // Auto-scroll chat history to bottom when new messages are added
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [task?.aiChatHistory]);

  const updateTask = (updatedTask: Task) => {
    const savedTasks = localStorage.getItem('todos');
    if (savedTasks) {
      const tasks: Task[] = JSON.parse(savedTasks);
      const updatedTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      localStorage.setItem('todos', JSON.stringify(updatedTasks));
      setTask(updatedTask);
    }
  };

  const toggleStep = (stepId: string) => {
    if (!task) return;
    
    const updatedSteps = task.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    
    updateTask({ ...task, steps: updatedSteps });
  };

  const generateStepsWithAI = async () => {
    if (!task || !aiInput.trim()) return;
    
    setIsGeneratingSteps(true);
    
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: task.text,
          userInput: aiInput,
          existingSteps: task.steps,
          chatHistory: task.aiChatHistory,
          forceSteps: forceSteps // Add forceSteps flag to API request
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate steps');
      }

      const data = await response.json();
      
      // Update task with new steps and chat history
      const updatedTask: Task = {
        ...task,
        steps: data.steps,
        aiChatHistory: [...task.aiChatHistory, `User: ${aiInput}`, `AI: ${data.response}`]
      };
      
      updateTask(updatedTask);
      setAiInput('');
    } catch (error) {
      console.error('Error generating steps:', error);
      alert('Failed to generate steps. Please try again.');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const openGenerateStepsModal = () => {
    setShowGenerateStepsModal(true);
    setGenerateStepsInput('');
  };

  const closeGenerateStepsModal = () => {
    setShowGenerateStepsModal(false);
    setGenerateStepsInput('');
  };

  const generateStepsFromChatHistory = async (userInput?: string) => {
    if (!task || task.aiChatHistory.length === 0) return;
    
    setIsGeneratingSteps(true);
    
    try {
      const response = await fetch('/api/ai-assistant/generate-steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: task.text,
          userInput: userInput || '',
          existingSteps: task.steps,
          chatHistory: task.aiChatHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate steps');
      }

      const data = await response.json();
      
      // Update task with new steps and chat history
      const userMessage = userInput 
        ? `Generate steps with additional input: ${userInput}`
        : 'Generate steps from chat history';
      
      const updatedTask: Task = {
        ...task,
        steps: data.steps,
        aiChatHistory: [...task.aiChatHistory, `User: ${userMessage}`, `AI: Generated ${data.steps.length} action steps`]
      };
      
      updateTask(updatedTask);
      closeGenerateStepsModal();
    } catch (error) {
      console.error('Error generating steps from chat history:', error);
      alert('Failed to generate steps. Please try again.');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const handleGenerateStepsSubmit = () => {
    if (generateStepsInput.trim()) {
      generateStepsFromChatHistory(generateStepsInput);
    } else {
      generateStepsFromChatHistory();
    }
  };

  const deleteStep = (stepId: string) => {
    if (!task) return;
    
    const updatedSteps = task.steps.filter(step => step.id !== stepId);
    updateTask({ ...task, steps: updatedSteps });
  };

  const openDeadlineModal = () => {
    setShowDeadlineModal(true);
    setDeadlineInput(task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
  };

  const closeDeadlineModal = () => {
    setShowDeadlineModal(false);
    setDeadlineInput('');
  };

  const updateDeadline = () => {
    if (!task) return;
    
    let deadline: Date | undefined;
    
    if (deadlineInput) {
      deadline = new Date(deadlineInput);
      if (isNaN(deadline.getTime())) {
        alert('Invalid deadline date');
        return;
      }
    }

    const updatedTask = { ...task, deadline };
    updateTask(updatedTask);
    closeDeadlineModal();
  };

  const removeDeadline = () => {
    if (!task) return;
    
    const updatedTask = { ...task, deadline: undefined };
    updateTask(updatedTask);
    closeDeadlineModal();
  };

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return '';
    
    // Check if this is a step generation response (contains STEPS_START/STEPS_END)
    if (text.includes('STEPS_START') && text.includes('STEPS_END')) {
      // For step generation responses, don't apply markdown to the steps section
      const parts = text.split(/(STEPS_START[\s\S]*?STEPS_END)/);
      return (
        <div>
          {parts.map((part, index) => {
            if (part.includes('STEPS_START')) {
              // Keep steps section as plain text for proper parsing
              return <pre key={index} className="whitespace-pre-wrap bg-gray-100 p-2 rounded text-sm">{part}</pre>;
            } else {
              // Apply markdown to the rest of the text
              return <div key={index} dangerouslySetInnerHTML={{ __html: applyMarkdown(part) }} />;
            }
          })}
        </div>
      );
    }
    
    // Regular markdown rendering for non-step responses
    return <div dangerouslySetInnerHTML={{ __html: applyMarkdown(text) }} />;
  };

  // Helper function to apply markdown transformations
  const applyMarkdown = (text: string) => {
    if (!text) return '';
    
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-2 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-3 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      // Lists (only for non-step content)
      .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/(<li.*<\/li>)/gim, '<ul class="list-disc ml-4 space-y-1">$1</ul>')
      // Code blocks
      .replace(/```([^`]+)```/gim, '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      // Line breaks
      .replace(/\n/gim, '<br>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-blue-500 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  };

  if (!task) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600">Task not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Task Details</h1>
          <div className="w-20"></div> {/* Spacer for alignment */}
        </div>

        {/* Task Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{task.text}</h2>
              <p className="text-gray-600 text-sm">
                Created: {new Date(task.createdAt).toLocaleDateString()}
              </p>
              {task.deadline && (
                <div className={`mt-2 text-sm ${
                  new Date(task.deadline) < new Date() && !task.completed 
                    ? 'text-red-500 font-medium' 
                    : 'text-gray-600'
                }`}>
                  ⏰ Deadline: {formatPerthTime(new Date(task.deadline))}
                  {new Date(task.deadline) < new Date() && !task.completed && ' (Overdue)'}
                </div>
              )}
            </div>
            <button
              onClick={openDeadlineModal}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              {task.deadline ? 'Edit Deadline' : 'Set Deadline'}
            </button>
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm ${
            task.completed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {task.completed ? 'Completed' : 'In Progress'}
          </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">GoalBee 🐝</h3>
          <div className="space-y-4">
            {/* Chat History */}
            {task.aiChatHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Chat History (Last 10 messages)</h4>
                <div 
                  ref={chatHistoryRef}
                  className="space-y-2 max-h-150 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50"
                >
                  {task.aiChatHistory.slice(-10).map((message, index) => (
                    <div
                      key={index}
                      className={`text-sm p-2 rounded ${
                        message.startsWith('User:') 
                          ? 'bg-blue-50 text-blue-800' 
                          : 'bg-purple-50 text-purple-800'
                      }`}
                    >
                      {message.startsWith('User:') ? (
                        <div>{message}</div>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          {renderMarkdown(message.replace('AI: ', ''))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="forceSteps"
                  checked={forceSteps}
                  onChange={(e) => setForceSteps(e.target.checked)}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                />
                <label htmlFor="forceSteps" className="text-sm text-gray-700">
                  Always generate steps (best effort with available info)
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask GoalBee to create steps..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isGeneratingSteps) {
                      generateStepsWithAI();
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={generateStepsWithAI}
                    disabled={isGeneratingSteps || !aiInput.trim()}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isGeneratingSteps ? 'Generating...' : 'Chat'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Action Steps</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {task.steps.filter(s => s.completed).length} of {task.steps.length} completed
              </span>
            </div>
          </div>

          {task.steps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No steps yet. Use the AI assistant above to generate steps!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {task.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => toggleStep(step.id)}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      step.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {step.text}
                  </span>
                  <button
                    onClick={() => deleteStep(step.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Steps Modal */}
      {showGenerateStepsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Action Steps</h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide additional context or requirements for the steps (optional):
            </p>
            <textarea
              value={generateStepsInput}
              onChange={(e) => setGenerateStepsInput(e.target.value)}
              placeholder="E.g., Focus on technical aspects, include testing phase, make steps more detailed..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={closeGenerateStepsModal}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateStepsSubmit}
                disabled={isGeneratingSteps}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGeneratingSteps ? 'Generating...' : 'Generate Steps'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {task?.deadline ? 'Edit Deadline' : 'Set Deadline'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a deadline for this task to receive push notifications when it's due:
            </p>
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 mt-4">
              {task?.deadline && (
                <button
                  onClick={removeDeadline}
                  className="px-4 py-2 text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Remove Deadline
                </button>
              )}
              <button
                onClick={closeDeadlineModal}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateDeadline}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {task?.deadline ? 'Update' : 'Set Deadline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
