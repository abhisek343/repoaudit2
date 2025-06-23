const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running all frontend tests...');
  
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  // Run the tests
  const result = execSync('npm test', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ All tests completed!');
} catch (error) {
  console.log('\n❌ Tests failed with exit code:', error.status);
  process.exit(error.status || 1);
}