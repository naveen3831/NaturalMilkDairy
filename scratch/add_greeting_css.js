const fs = require('fs');

const cssPath = 'client/src/index.css';
let content = fs.readFileSync(cssPath, 'utf8');

const greetingCss = `
/* Greeting Box Styles */
.mobile-home-greeting-box {
  padding: 14px 18px 4px 18px;
  display: flex;
  flex-direction: column;
}

.mobile-home-greeting-salutation {
  font-size: 0.88rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}

.mobile-home-greeting-name {
  font-size: 1.45rem;
  font-weight: 900;
  color: #0c2340;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: -0.02em;
}

.mobile-home-greeting-sub {
  font-size: 0.8rem;
  font-weight: 500;
  color: #64748b;
  margin: 4px 0 0 0;
  line-height: 1.35;
}

.desktop-home-greeting-section {
  width: 100%;
  max-width: 1240px;
  margin: 20px auto 0 auto;
  padding: 0 20px;
}

.desktop-home-greeting-inner {
  display: flex;
  flex-direction: column;
}

.desktop-home-greeting-salutation {
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 2px;
}

.desktop-home-greeting-name {
  font-size: 1.85rem;
  font-weight: 900;
  color: #0c2340;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
}

.desktop-home-greeting-sub {
  font-size: 0.92rem;
  font-weight: 500;
  color: #64748b;
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.greeting-sun-emoji {
  font-size: 1.4rem;
  display: inline-block;
}
`;

if (!content.includes('mobile-home-greeting-box')) {
  content += greetingCss;
  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('Appended greeting CSS to index.css');
} else {
  console.log('Greeting CSS already present');
}
