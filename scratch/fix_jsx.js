const fs = require('fs');
let content = fs.readFileSync('client/src/pages/HomePage.jsx', 'utf8');

content = content.replace(/aria-label=\{Go to slide\s*\+\s*\(idx\s*\+\s*1\)\}/g, "aria-label={'Go to slide ' + (idx + 1)}");
content = content.replace(/className=\{`mobile-home-carousel-dot`\s*\+\s*\(idx === activeBannerIndex \? ' is-active' : ''\)\}/g, "className={'mobile-home-carousel-dot' + (idx === activeBannerIndex ? ' is-active' : '')}");
content = content.replace(/className=\{`desktop-carousel-dot`\s*\+\s*\(idx === activeBannerIndex \? ' is-active' : ''\)\}/g, "className={'desktop-carousel-dot' + (idx === activeBannerIndex ? ' is-active' : '')}");

fs.writeFileSync('client/src/pages/HomePage.jsx', content, 'utf8');
console.log('Fixed aria-label and className strings');
