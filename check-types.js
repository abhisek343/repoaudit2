const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Checking TypeScript types...');
  
  // Change to frontend directory
  process.chdir(path.join(__dirname, 'frontend'));
  
  // Run TypeScript compiler check
  const result = execSync('npx tsc --noEmit', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ TypeScript types are valid!');
  console.log(result);
} catch (error) {
  console.log('❌ TypeScript errors found:');
  console.log('stdout:', error.stdout);
  console.log('stderr:', error.stderr);
  
  // Try the build anyway to see if it's just type warnings
  try {
    console.log('\n🔄 Attempting build despite type errors...');
    const buildResult = execSync('npm run build', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ Build succeeded despite type warnings!');
    console.log(buildResult);
  } catch (buildError) {
    console.log('❌ Build also failed:');
    console.log('stdout:', buildError.stdout);
    console.log('stderr:', buildError.stderr);
  }
}