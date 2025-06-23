const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Testing cache statistics fix...');
  
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  // Run only the failing test
  const result = execSync('npx jest --testNamePattern="should provide correct cache statistics"', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Cache statistics test passed!');
  console.log(result);
} catch (error) {
  console.log('❌ Cache statistics test failed:');
  console.log('Exit code:', error.status);
  console.log('stdout:', error.stdout);
  console.log('stderr:', error.stderr);
  
  // If that specific test failed, run all tests to see the overall status
  try {
    console.log('\n🔄 Running all tests...');
    const allResults = execSync('npm test', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ All tests passed!');
    console.log(allResults);
  } catch (allError) {
    console.log('❌ Some tests still failing:');
    console.log(allError.stdout);
  }
}