const fs = require('fs');
let content = fs.readFileSync('server/routes/customerRoutes.js', 'utf8');

if (!content.includes('upgradePlan')) {
  content = content.replace(
    /setTemporaryQty,\r?\n/,
    'setTemporaryQty,\r\n  upgradePlan,\r\n  extendSubscription,\r\n'
  );
  content = content.replace(
    /router\.post\('\/:id\/temp-qty', verifyToken, authorizeCustomerAccess, setTemporaryQty\);/,
    "router.post('/:id/temp-qty', verifyToken, authorizeCustomerAccess, setTemporaryQty);\r\nrouter.post('/:id/upgrade-plan', verifyToken, authorizeCustomerAccess, upgradePlan);\r\nrouter.post('/:id/extend-subscription', verifyToken, authorizeCustomerAccess, extendSubscription);\r\nrouter.post('/me/subscription/upgrade', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return upgradePlan(req, res, next); });\r\nrouter.post('/me/subscription/extend', verifyToken, requireCustomer, (req, res, next) => { req.params.id = 'me'; return extendSubscription(req, res, next); });"
  );
  fs.writeFileSync('server/routes/customerRoutes.js', content, 'utf8');
  console.log('Updated customerRoutes.js successfully');
} else {
  console.log('Already includes upgradePlan');
}
