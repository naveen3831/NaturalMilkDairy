const fs = require('fs');

const path = 'client/src/pages/HomePage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add greeting helper if not already present
const greetingLogic = `
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) return 'Good Afternoon,';
    if (hour >= 17 || hour < 5) return 'Good Evening,';
    return 'Good Morning,';
  };

  const displayName = user?.name || user?.fullName || 'Naveen Kumar';
  const salutation = getGreeting();
`;

if (!content.includes('const getGreeting =')) {
  content = content.replace('  const renderMobileHome = () => {', `${greetingLogic}\r\n  const renderMobileHome = () => {`);
}

// 2. Add greeting in mobile view right before mobile-home-carousel-wrapper
const mobileGreetingJSX = `
        {/* Dynamic User Greeting matching Screenshot */}
        <div className="mobile-home-greeting-box">
          <span className="mobile-home-greeting-salutation">{salutation}</span>
          <h2 className="mobile-home-greeting-name">
            {displayName} <span className="greeting-sun-emoji">☀️</span>
          </h2>
          <p className="mobile-home-greeting-sub">
            Fresh farm goodness delivered to your doorstep every morning.
          </p>
        </div>
`;

if (!content.includes('mobile-home-greeting-box')) {
  content = content.replace('<div className="mobile-home-container">', `<div className="mobile-home-container">\r\n${mobileGreetingJSX}`);
}

// 3. Add greeting in desktop view right before desktop-hero-carousel-container
const desktopGreetingJSX = `
      {/* Desktop Greeting Section matching Screenshot */}
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
`;

if (!content.includes('desktop-home-greeting-section')) {
  content = content.replace('<section className="desktop-hero-carousel-container">', `${desktopGreetingJSX}\r\n      <section className="desktop-hero-carousel-container">`);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated HomePage.jsx with Greeting');
