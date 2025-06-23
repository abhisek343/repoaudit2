// Simple test to verify the compression/decompression fixes
const { execSync } = require('child_process');

try {
  console.log('Running tests...');
  const result = execSync('npm test', { 
    cwd: './frontend',
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('Test output:', result);
} catch (error) {
  console.log('Test failed with error:', error.message);
  console.log('stdout:', error.stdout);
  console.log('stderr:', error.stderr);
}