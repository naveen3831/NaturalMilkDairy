const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'routes', 'customerRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldRoutes = `router.post('/:id/upgrade-plan', verifyToken, authorizeCustomerAccess, upgradePlan);
router.post('/:id/extend-subscription', verifyToken, authorizeCustomerAccess, extendSubscription);`;

const newRoutes = `const allowCustomerOrGuest = (req, res, next) => {
  if (req.user) {
    return authorizeCustomerAccess(req, res, next);
  }
  if (req.params.id === 'me' || req.body.mobile) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Login or mobile number required.' });
};

router.post('/:id/upgrade-plan', optionalToken, allowCustomerOrGuest, upgradePlan);
router.post('/:id/extend-subscription', optionalToken, allowCustomerOrGuest, extendSubscription);`;

if (content.includes('router.post(\'/:id/upgrade-plan\', verifyToken, authorizeCustomerAccess, upgradePlan);')) {
  content = content.replace(oldRoutes, newRoutes);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated customerRoutes.js!');
