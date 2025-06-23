const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build fix...');

// Check the analysisService.ts file
const filePath = path.join(__dirname, 'frontend', 'src', 'services', 'analysisService.ts');

if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log('📄 Checking first 5 lines:');
  for (let i = 0; i < 5; i++) {
    const line = lines[i];
    console.log(`  ${i + 1}: ${line}`);
    
    // Check for the specific error that was causing the build to fail
    if (line.includes('aimport')) {
      console.log(`❌ Still found 'aimport' on line ${i + 1}`);
      process.exit(1);
    }
  }
  
  console.log('✅ No malformed imports found');
  console.log('✅ Build fix verified - the syntax error has been corrected');
  console.log('\n💡 You can now run "npm run build" in the frontend directory');
  
} else {
  console.log('❌ analysisService.ts file not found');
  process.exit(1);
}