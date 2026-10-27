const fs = require('fs');

const cssPath = 'client/src/index.css';
let content = fs.readFileSync(cssPath, 'utf8');

const oldDesktopCss = `/* Desktop Carousel Styles */
.desktop-hero-carousel-container {
  width: 100%;
  max-width: 1240px;
  margin: 20px auto 30px auto;
  padding: 0 20px;
}

.desktop-hero-carousel-inner {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(13, 92, 58, 0.1);
  background: #f8fafc;
}

.desktop-hero-carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  width: 100%;
}

.desktop-hero-carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  line-height: 0;
  max-height: 480px;
}

.desktop-hero-carousel-img {
  width: 100%;
  height: 480px;
  object-fit: cover;
  display: block;
}`;

const newDesktopCss = `/* Desktop Carousel Styles */
.desktop-hero-carousel-container {
  width: 100%;
  max-width: 980px;
  margin: 10px auto 32px auto;
  padding: 0 20px;
}

.desktop-hero-carousel-inner {
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(13, 92, 58, 0.14);
  background: #f8fafc;
  aspect-ratio: 455 / 298;
}

.desktop-hero-carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  width: 100%;
  height: 100%;
}

.desktop-hero-carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  line-height: 0;
}

.desktop-hero-carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}`;

if (content.includes(oldDesktopCss)) {
  content = content.replace(oldDesktopCss, newDesktopCss);
  console.log('Replaced desktop carousel CSS successfully');
} else {
  console.log('Old desktop CSS not found exactly, updating individual classes');
  content = content.replace(/max-width: 1240px;/, 'max-width: 980px;');
  content = content.replace(/max-height: 480px;/, 'height: 100%;');
  content = content.replace(/height: 480px;/, 'height: 100%;');
  content = content.replace(/border-radius: 24px;\s*overflow: hidden;\s*box-shadow: 0 10px 30px rgba\(13, 92, 58, 0\.1\);\s*background: #f8fafc;/, 'border-radius: 22px;\r\n  overflow: hidden;\r\n  box-shadow: 0 12px 32px rgba(13, 92, 58, 0.14);\r\n  background: #f8fafc;\r\n  aspect-ratio: 455 / 298;');
}

// Center the desktop carousel dots
content = content.replace(
  /\.desktop-carousel-dots\s*\{\s*position:\s*absolute;\s*bottom:\s*20px;\s*left:\s*36px;/,
  '.desktop-carousel-dots {\r\n  position: absolute;\r\n  bottom: 20px;\r\n  left: 50%;\r\n  transform: translateX(-50%);'
);

// Update desktop greeting section width to 980px
content = content.replace(
  /\.desktop-home-greeting-section\s*\{\s*width:\s*100%;\s*max-width:\s*1240px;/,
  '.desktop-home-greeting-section {\r\n  width: 100%;\r\n  max-width: 980px;'
);

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Updated client/src/index.css');
