import 'fake-indexeddb/auto';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Jest tests
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Polyfill structuredClone for fake-indexeddb in Node environment
if (typeof (global as any).structuredClone !== 'function') {
  (global as any).structuredClone = (value: any) => JSON.parse(JSON.stringify(value));
}

// Mock performance.now for compression timing
if (typeof (global as any).performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now()
  };
}

// Ensure console methods are available
if (typeof console.log === 'undefined') {
  console.log = jest.fn();
}
if (typeof console.error === 'undefined') {
  console.error = jest.fn();
}
if (typeof console.warn === 'undefined') {
  console.warn = jest.fn();
}

// Polyfill btoa/atob for base64 encoding/decoding
if (typeof (global as any).btoa === 'undefined') {
  (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof (global as any).atob === 'undefined') {
  (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
} 