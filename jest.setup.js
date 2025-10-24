// Jest setup file - CommonJS syntax
require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useParams: () => ({
    id: 'test-id',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock environment variables
process.env.DEEPSEEK_API_KEY = 'test-api-key';
process.env.APP_PASSWORD = 'test-password';

// Global test utilities
global.console = {
  ...console,
  // uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
