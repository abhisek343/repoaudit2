const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running frontend tests...');
  
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  // Run the tests
  const result = execSync('npm test', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Tests passed!');
  console.log(result);
} catch (error) {
  console.log('❌ Tests failed:');
  console.log('Exit code:', error.status);
  console.log('stdout:', error.stdout);
  console.log('stderr:', error.stderr);
  process.exit(1);
}