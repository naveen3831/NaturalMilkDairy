const fs = require('fs');

const imgPath = "C:/Users/LENOVO/.gemini/antigravity/brain/c1b964a4-b66e-47db-a530-0d93dc258c8d/.user_uploaded/media_1793175063073_7adb6fba.png";
const buf = fs.readFileSync(imgPath);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`Original img1: ${width}x${height}`);

const currentPhone = "C:/Users/LENOVO/.gemini/antigravity/brain/c1b964a4-b66e-47db-a530-0d93dc258c8d/.user_uploaded/media_1793178833334_d854daed.png";
const buf2 = fs.readFileSync(currentPhone);
console.log(`Current phone screenshot: ${buf2.readUInt32BE(16)}x${buf2.readUInt32BE(20)}`);
