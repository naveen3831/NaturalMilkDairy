const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'routes', 'customerRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

// Ensure optionalToken is imported
if (!content.includes('optionalToken,')) {
  content = content.replace(
    'const { verifyToken,',
    'const { verifyToken, optionalToken,'
  );
}

// Replace the route
const oldRouteLine = "router.post('/:id/upgrade-plan', verifyToken, authorizeCustomerAccess, upgradePlan);";
const newRouteCode = `const allowCustomerOrGuest = (req, res, next) => {
  if (req.user) {
    return authorizeCustomerAccess(req, res, next);
  }
  if (req.params.id === 'me' || req.body?.mobile) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Login or mobile number required.' });
};

router.post('/:id/upgrade-plan', optionalToken, allowCustomerOrGuest, upgradePlan);`;

if (content.includes(oldRouteLine)) {
  content = content.replace(oldRouteLine, newRouteCode);
} else {
  // Try regex replace
  content = content.replace(
    /router\.post\('\/:id\/upgrade-plan',.*upgradePlan\);/,
    newRouteCode
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('customerRoutes.js updated with optionalToken and allowCustomerOrGuest!');
