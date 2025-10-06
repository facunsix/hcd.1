// Module compatibility fix for browser environment
// This file ensures that all modules are loaded correctly

// Global module compatibility
if (typeof window !== 'undefined') {
  // Browser environment - ensure require is not used
  if (typeof require !== 'undefined') {
    console.warn('CommonJS require detected - this may cause issues in browser');
  }
  
  // Polyfill for Node.js timeout types in browser
  if (!window.NodeJS) {
    window.NodeJS = {};
  }
}

export {};