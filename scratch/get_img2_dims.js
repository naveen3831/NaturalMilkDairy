const fs = require('fs');

const imgPath = "C:/Users/LENOVO/.gemini/antigravity/brain/c1b964a4-b66e-47db-a530-0d93dc258c8d/.user_uploaded/media_1793178941507_9e3180cc.png";
const stats = fs.statSync(imgPath);
console.log("File size:", stats.size);

// Read PNG header to get width and height
const buf = fs.readFileSync(imgPath);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`Dimensions: ${width}x${height}`);
