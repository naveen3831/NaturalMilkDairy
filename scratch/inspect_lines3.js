const fs = require('fs');
const content = fs.readFileSync('mobile/lib/screens/home/home_screen.dart', 'utf8');
const lines = content.split('\n');

for (let i = 1860; i < 1920; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
