const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Testing build...');
  
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  // Run the build
  const result = execSync('npm run build', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Build completed successfully!');
} catch (error) {
  console.log('\n❌ Build failed with exit code:', error.status);
  console.log('Error output:', error.message);
  process.exit(error.status || 1);
}