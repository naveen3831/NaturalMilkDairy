const { exec } = require('child_process');
const path = require('path');

const adbPath = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function ensureReverse() {
  exec(`"${adbPath}" reverse --list`, (err, stdout) => {
    if (err) return;
    if (!stdout.includes('tcp:5000 tcp:5000')) {
      exec(`"${adbPath}" reverse tcp:5000 tcp:5000`, (revErr) => {
        if (!revErr) {
          console.log(`[${new Date().toLocaleTimeString()}] ⚡ Re-established adb reverse tcp:5000 tcp:5000`);
        }
      });
      exec(`"${adbPath}" reverse tcp:3000 tcp:3000`);
    }
  });
}

console.log('👀 Watching ADB device connection to keep tcp:5000 reversed automatically...');
ensureReverse();
setInterval(ensureReverse, 3000);
