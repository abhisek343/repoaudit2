// Debug compression behavior
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
  },
  {
    path: 'README.md',
    name: 'README.md',
    type: 'file',
    size: 800,
    content: '# Test Repository\n\nThis is a test repository.',
    language: 'markdown'
  }
];

const filesJson = JSON.stringify(mockFiles);
console.log('Files JSON:');
console.log(filesJson);
console.log('\nJSON length:', filesJson.length);
console.log('Encoded size:', new TextEncoder().encode(filesJson).length);

// Calculate individual file content sizes
const totalContentSize = mockFiles.reduce((sum, file) => sum + (file.content?.length || 0), 0);
console.log('Total file content size:', totalContentSize);

console.log('\nDifference (JSON size - content size):', new TextEncoder().encode(filesJson).length - totalContentSize);