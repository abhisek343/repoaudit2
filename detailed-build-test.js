const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testBuild() {
  try {
    console.log('🔍 Detailed Build Test Starting...');
    
    // Change to frontend directory
    const frontendDir = path.join(__dirname, 'frontend');
    process.chdir(frontendDir);
    
    console.log('📁 Working directory:', process.cwd());
    
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.log('❌ package.json not found');
      return;
    }
    
    console.log('✅ package.json found');
    
    // Check the problematic file
    const analysisServicePath = path.join('src', 'services', 'analysisService.ts');
    if (fs.existsSync(analysisServicePath)) {
      const content = fs.readFileSync(analysisServicePath, 'utf8');
      const firstFewLines = content.split('\n').slice(0, 5);
      console.log('📄 First 5 lines of analysisService.ts:');
      firstFewLines.forEach((line, i) => {
        console.log(`  ${i + 1}: ${line}`);
      });
    }
    
    // Try TypeScript compilation first
    console.log('\n🔧 Testing TypeScript compilation...');
    try {
      const tscResult = execSync('npx tsc --noEmit --skipLibCheck', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ TypeScript compilation successful');
    } catch (tscError) {
      console.log('❌ TypeScript compilation failed:');
      console.log(tscError.stdout);
      console.log(tscError.stderr);
    }
    
    // Try the build
    console.log('\n🏗️ Testing Vite build...');
    try {
      const buildResult = execSync('npm run build', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ Build successful!');
      console.log(buildResult);
    } catch (buildError) {
      console.log('❌ Build failed:');
      console.log('Exit code:', buildError.status);
      console.log('stdout:', buildError.stdout);
      console.log('stderr:', buildError.stderr);
      
      // Try to identify the specific issue
      const errorOutput = buildError.stdout + buildError.stderr;
      if (errorOutput.includes('Expected ";" but found "{"')) {
        console.log('\n🔍 Detected import syntax error. Checking imports...');
        
        // Check for malformed imports
        const files = ['src/services/analysisService.ts'];
        for (const file of files) {
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, i) => {
              if (line.includes('import') && (line.includes('aimport') || line.includes('iimport'))) {
                console.log(`❌ Found malformed import in ${file} line ${i + 1}: ${line}`);
              }
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testBuild();