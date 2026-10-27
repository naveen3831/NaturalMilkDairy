const fs = require('fs');

const path = 'client/src/pages/HomePage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update displayName to be reactive and accurate
content = content.replace(
  "const displayName = user?.name || user?.fullName || 'Naveen Kumar';",
  "const displayName = user?.name?.trim() || user?.fullName?.trim() || (user ? 'Customer' : 'Welcome');"
);

// 2. Only show greeting on first carousel slide in desktop view
const oldDesktopGreetingBlock = `      {/* Desktop Greeting Section matching Screenshot */}
      <div className="desktop-home-greeting-section">
        <div className="desktop-home-greeting-inner">
          <span className="desktop-home-greeting-salutation">{salutation}</span>
          <h2 className="desktop-home-greeting-name">
            {displayName} <span className="greeting-sun-emoji">☀️</span>
          </h2>
          <p className="desktop-home-greeting-sub">
            Fresh farm goodness delivered to your doorstep every morning.
          </p>
        </div>
      </div>`;

const newDesktopGreetingBlock = `      {/* Desktop Greeting Section: only shown on first carousel slide */}
      {activeBannerIndex === 0 && (
        <div className="desktop-home-greeting-section">
          <div className="desktop-home-greeting-inner">
            <span className="desktop-home-greeting-salutation">{salutation}</span>
            <h2 className="desktop-home-greeting-name">
              {displayName} <span className="greeting-sun-emoji">☀️</span>
            </h2>
            <p className="desktop-home-greeting-sub">
              Fresh farm goodness delivered to your doorstep every morning.
            </p>
          </div>
        </div>
      )}`;

if (content.includes(oldDesktopGreetingBlock)) {
  content = content.replace(oldDesktopGreetingBlock, newDesktopGreetingBlock);
  console.log('Updated desktop greeting to only show on first carousel slide');
} else {
  console.log('oldDesktopGreetingBlock not matched directly, checking variations');
  content = content.replace(
    /<div className="desktop-home-greeting-section">[\s\S]*?<\/div>\s*<\/div>/,
    newDesktopGreetingBlock
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('HomePage.jsx updated successfully');
