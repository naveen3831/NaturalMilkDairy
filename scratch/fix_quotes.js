const fs = require('fs');

let content = fs.readFileSync('client/src/pages/HomePage.jsx', 'utf8');

// 1. Fix ChevronLeft import if not present
if (!content.includes('ChevronLeft')) {
  content = content.replace('ChevronRight,', 'ChevronLeft,\r\n  ChevronRight,');
}

// 2. Fix unquoted classNames
content = content.replace(
  'className={mobile-home-carousel-dot + (idx === activeBannerIndex ? \' is-active\' : \'\')}',
  'className={`mobile-home-carousel-dot${idx === activeBannerIndex ? \' is-active\' : \'\'}`}'
);

content = content.replace(
  'className={desktop-carousel-dot + (idx === activeBannerIndex ? \' is-active\' : \'\')}',
  'className={`desktop-carousel-dot${idx === activeBannerIndex ? \' is-active\' : \'\'}`}'
);

// 3. Fix arrows in desktop carousel
content = content.replace('â€¹', '‹');
content = content.replace('â€º', '›');

fs.writeFileSync('client/src/pages/HomePage.jsx', content, 'utf8');
console.log('Fixed HomePage.jsx successfully');
