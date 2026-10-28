const fs = require('fs');
const path = require('path');

const img1 = "C:/Users/LENOVO/.gemini/antigravity/brain/c1b964a4-b66e-47db-a530-0d93dc258c8d/.user_uploaded/media_1793175063073_7adb6fba.png";
const img2 = "C:/Users/LENOVO/.gemini/antigravity/brain/c1b964a4-b66e-47db-a530-0d93dc258c8d/.user_uploaded/media_1793175125263_f70c6241.png";

console.log("img1 exists:", fs.existsSync(img1), "size:", fs.statSync(img1).size);
console.log("img2 exists:", fs.existsSync(img2), "size:", fs.statSync(img2).size);
