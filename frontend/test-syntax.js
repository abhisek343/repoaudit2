const fs = require('fs');
const path = require('path');

// Simple syntax check for the analysisService file
const filePath = path.join(__dirname, 'src', 'services', 'analysisService.ts');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for common syntax issues
  const lines = content.split('\n');
  
  console.log('Checking first 10 lines for syntax issues:');
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    console.log(`${i + 1}: ${line}`);
    
    // Check for common issues
    if (line.includes('aimport') || line.includes('iimport')) {
      console.log(`❌ Line ${i + 1}: Found malformed import`);
    }
    if (line.includes('import') && !line.includes('//') && !line.trim().endsWith(';') && line.includes('{') && !line.includes('}')) {
      console.log(`⚠️ Line ${i + 1}: Possible incomplete import`);
    }
  }
  
  console.log('\n✅ Basic syntax check completed');
  
} catch (error) {
  console.error('❌ Error reading file:', error.message);
}