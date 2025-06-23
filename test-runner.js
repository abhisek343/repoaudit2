const { spawn } = require('child_process');
const path = require('path');

// Change to frontend directory and run tests
const frontendPath = path.join(__dirname, 'frontend');

console.log('Running tests in:', frontendPath);

const testProcess = spawn('npm', ['test'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  console.log(`Test process exited with code ${code}`);
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
});