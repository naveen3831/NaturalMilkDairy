const fs = require('fs');

const buf = fs.readFileSync('mobile/assets/images/sub_hero_banner.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`sub_hero_banner.png: ${width}x${height}, size: ${buf.length}`);
