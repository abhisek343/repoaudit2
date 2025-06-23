// Simple verification of the stats calculation logic
const mockFiles = [
  {
    path: 'src/index.ts',
    name: 'index.ts',
    type: 'file',
    size: 1000,
    content: 'console.log("Hello World");',
    language: 'typescript'
  },
  {
    path: 'package.json',
    name: 'package.json',
    type: 'file',
    size: 500,
    content: '{"name": "test-repo", "version": "1.0.0"}',
    language: 'json'
  }
];

// Calculate sizes like the code does
const filesJson = JSON.stringify(mockFiles);
const originalSize = new TextEncoder().encode(filesJson).length;

console.log('Files JSON length:', filesJson.length);
console.log('Encoded size:', originalSize);

// Simulate compression (typical compression ratio is around 1.8:1 for JSON)
const compressedSize = Math.round(originalSize / 1.8);
const spaceSaved = originalSize - compressedSize;

console.log('Original size:', originalSize);
console.log('Compressed size:', compressedSize);
console.log('Space saved:', spaceSaved);
console.log('Space saved should be positive:', spaceSaved > 0);

// The issue was that we were using file content lengths instead of JSON size
const fileContentSize = mockFiles.reduce((sum, file) => sum + (file.content?.length || 0), 0);
console.log('File content size (old method):', fileContentSize);
console.log('Difference:', originalSize - fileContentSize);