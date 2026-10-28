const fs = require('fs');
const content = fs.readFileSync('mobile/lib/screens/home/home_screen.dart', 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

const subTabStart = lines.findIndex(l => l.includes('Widget _buildSubscriptionTab'));
const subTabEnd = lines.findIndex((l, idx) => idx > subTabStart && l.includes('Widget _buildDeliveriesTab'));

console.log(`SubTab from line ${subTabStart+1} to ${subTabEnd+1}`);
