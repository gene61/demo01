'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TaskStep {
  id: string;
  text: string;
  completed: boolean;
}

interface Todo {
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

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  // Check if already authenticated on component mount
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load todos from localStorage on authentication
  useEffect(() => {
    if (isAuthenticated) {
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }
    }
  }, [isAuthenticated]);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  }, [todos, isAuthenticated]);

  // Sync is_empty status to Supabase when todos change
  useEffect(() => {
    const syncEmptyStatus = async () => {
      const isEmpty = todos.length === 0;
      
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Only update if there's an actual change in task count
            // This prevents unnecessary API calls when tasks are just being modified
            const currentTaskCount = todos.length;
            
            // Update is_empty in Supabase
            await fetch('/api/notifications/subscribe', {
              method: 'PATCH',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                endpoint: subscription.endpoint,
                is_empty: isEmpty
              })
            });
            console.log('Synced is_empty status:', isEmpty, 'with', currentTaskCount, 'tasks');
          }
        } catch (error) {
          console.error('Failed to sync empty status:', error);
        }
      }
    };

    if (isAuthenticated) {
      // Only sync when there's an actual change in the number of tasks
      // This prevents syncing when just chatting with AI (which updates localStorage but not task count)
      const timeoutId = setTimeout(syncEmptyStatus, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [todos.length, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        alert('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Authentication failed. Please try again.');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setPassword('');
  };

  // Subscribe to push notifications
  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    // First, ask user if they want to enable notifications
    const userConfirmed = window.confirm(
      'Enable push notifications for deadline reminders?\n\n' +
      'You will receive notifications when tasks are due or overdue.\n\n' +
      'Click "OK" to allow notifications, or "Cancel" to skip.'
    );

    if (!userConfirmed) {
      console.log('User declined to enable notifications');
      return;
    }

    try {
      // Register service worker first
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');

      // Check if we already have a subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('📱 Found existing subscription:', subscription.endpoint);
        
        // Check if subscription is still valid
        try {
          // Send existing subscription to server to update/verify
          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription),
          });

          if (response.ok) {
            setIsSubscribed(true);
            localStorage.setItem('pushSubscribed', 'true');
            alert('✅ Already subscribed to deadline notifications!');
            return;
          }
        } catch (error) {
          console.log('Existing subscription might be invalid, creating new one...');
        }
      }

      // Check current permission status first
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'denied') {
        alert('Notifications are currently blocked. Please enable them in your browser settings to receive deadline reminders.');
        return;
      }
      
      // Request permission if not already granted or denied
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') {
          alert('Notification permission denied. You can enable notifications later in your browser settings.');
        } else {
          alert('Notification permission not granted.');
        }
        return;
      }

      // Convert VAPID public key to Uint8Array
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        alert('VAPID public key not configured');
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Log subscription data to console for debugging
      console.log('📱 New Push Subscription Data:', JSON.stringify(subscription, null, 2));
      console.log('🔑 Endpoint:', subscription.endpoint);
      console.log('✅ New push subscription created successfully');

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setIsSubscribed(true);
        localStorage.setItem('pushSubscribed', 'true');
        
        alert('✅ Successfully subscribed to deadline notifications!');
      } else {
        alert('Failed to subscribe to notifications');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to subscribe to notifications: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push service
        await subscription.unsubscribe();
        
        // Remove from server
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unregister service worker
        await registration.unregister();
        console.log('Service Worker unregistered');

        setIsSubscribed(false);
        localStorage.removeItem('pushSubscribed');
        alert('✅ Successfully unsubscribed from notifications and unregistered service worker');
      } else {
        // No subscription found, but still try to unregister service worker
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.unregister();
          console.log('Service Worker unregistered (no subscription found)');
        } catch (swError) {
          console.log('No service worker to unregister');
        }

        setIsSubscribed(false);
        localStorage.removeItem('pushSubscribed');
        alert('✅ Successfully unsubscribed from notifications');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      alert('Failed to unsubscribe from notifications: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Toggle subscription
  const toggleSubscription = () => {
    if (isSubscribed) {
      unsubscribeFromNotifications();
    } else {
      subscribeToNotifications();
    }
  };

  // Helper function to convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Function to get current subscription endpoint
  const getCurrentEndpoint = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setCurrentEndpoint(subscription.endpoint);
        console.log('📱 Current endpoint:', subscription.endpoint);
        alert(`Current endpoint:\n${subscription.endpoint}`);
      } else {
        setCurrentEndpoint(null);
        alert('No active subscription found');
      }
    } catch (error) {
      console.error('Error getting endpoint:', error);
      alert('Failed to retrieve endpoint: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Check if already subscribed and verify subscription status
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (isAuthenticated && localStorage.getItem('pushSubscribed') === 'true') {
        try {
          // Check if service worker is registered and subscription is valid
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
              setIsSubscribed(true);
              setCurrentEndpoint(subscription.endpoint);
            } else {
              // Subscription was revoked or expired
              setIsSubscribed(false);
              setCurrentEndpoint(null);
              localStorage.removeItem('pushSubscribed');
            }
          } else {
            setIsSubscribed(false);
            setCurrentEndpoint(null);
            localStorage.removeItem('pushSubscribed');
          }
        } catch (error) {
          console.error('Error checking subscription status:', error);
          setIsSubscribed(false);
          setCurrentEndpoint(null);
          localStorage.removeItem('pushSubscribed');
        }
      } else {
        setIsSubscribed(false);
        setCurrentEndpoint(null);
      }
    };

    checkSubscriptionStatus();
  }, [isAuthenticated]);

  const addTodo = () => {
    if (inputValue.trim() !== '') {
      let deadline: Date | undefined;
      
      if (deadlineInput) {
        deadline = new Date(deadlineInput);
        if (isNaN(deadline.getTime())) {
          alert('Invalid deadline date');
          return;
        }
      }

      const newTodo: Todo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        completed: false,
        createdAt: new Date(),
        deadline,
        steps: [],
        aiChatHistory: []
      };
      setTodos([...todos, newTodo]);
      setInputValue('');
      setDeadlineInput('');
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen animated-gradient flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Private Todo List</h1>
              <p className="text-gray-600">Enter password to access</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Access Todo List
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animated-gradient py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Control Buttons at Very Top */}
        <div className="flex justify-center items-center gap-2 mb-6">
          {/* Get Endpoint Button */}
          <button
            onClick={getCurrentEndpoint}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
            title="Get current push endpoint"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Endpoint
          </button>
          {/* Notification Toggle Button */}
          <button
            onClick={toggleSubscription}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
              isSubscribed 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isSubscribed ? 'Unsubscribe from notifications' : 'Subscribe to notifications'}
          >
            {isSubscribed ? (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Notifications
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.93 4.93l9.07 9.07-9.07 9.07L4.93 4.93z" />
                </svg>
                Notifications
              </>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Header with Todo List Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">GoalBee 🐝</h1>
          <p className="text-gray-600">Stay organized and productive</p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{totalCount - completedCount}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </div>
        </div>

        {/* Add Todo Form */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a task and enter deadline below..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <button
                onClick={addTodo}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm sm:text-base whitespace-nowrap min-w-[60px]"
              >
                Add
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Set deadline (optional)"
              />
            </div>
          </div>
        </div>


        {/* Todo List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {todos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📝</div>
              <p>No tasks yet. Add one above!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span
                      className={`block ${
                        todo.completed
                          ? 'line-through text-gray-400'
                          : 'text-gray-700'
                      }`}
                    >
                      {todo.text}
                    </span>
                    {todo.deadline && (
                      <div className={`text-xs mt-1 ${
                        new Date(todo.deadline) < new Date() && !todo.completed 
                          ? 'text-red-500 font-medium' 
                          : 'text-gray-500'
                      }`}>
                        ⏰ {formatPerthTime(new Date(todo.deadline))}
                        {new Date(todo.deadline) < new Date() && !todo.completed && ' (Overdue)'}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-10">
                    <button
                      onClick={() => router.push(`/task/${todo.id}`)}
                      className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-50 transition-colors"
                      title="View Details"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear Completed Button */}
        {completedCount > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={clearCompleted}
              className="px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear Completed ({completedCount})
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Your tasks are saved locally in your browser</p>
        </div>
      </div>
    </div>
  );
}
