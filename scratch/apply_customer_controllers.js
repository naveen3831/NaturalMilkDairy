const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'controllers', 'customerController.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix setTemporaryQty to support id === 'me'
const tempQtyOld = `// Temporary quantity change
const setTemporaryQty = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, milkQty, curdQty, actor } = req.body;
    const query = id.length === 24 ? { _id: id } : { customerId: id };

    const customer = await Customer.findOne(query);`;

const tempQtyNew = `// Temporary quantity change
const setTemporaryQty = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, milkQty, curdQty, actor } = req.body;
    let query;
    if (id === 'me') {
      const candidates = [
        ...(req.user?.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),
        ...(req.user?.customerId ? [{ customerId: req.user.customerId }] : []),
        ...(req.user?.mobile ? [{ mobile: req.user.mobile }] : []),
        ...(req.user?.email ? [{ email: req.user.email }] : []),
      ];
      query = candidates.length ? { $or: candidates } : { _id: req.user?.id };
    } else {
      query = id.length === 24 ? { _id: id } : { customerId: id };
    }

    const customer = await Customer.findOne(query);`;

if (content.includes('const query = id.length === 24 ? { _id: id } : { customerId: id };\r\n\r\n    const customer = await Customer.findOne(query);')) {
  content = content.replace(
    'const query = id.length === 24 ? { _id: id } : { customerId: id };\r\n\r\n    const customer = await Customer.findOne(query);',
    `let query;\r\n    if (id === 'me') {\r\n      const candidates = [\r\n        ...(req.user?.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),\r\n        ...(req.user?.customerId ? [{ customerId: req.user.customerId }] : []),\r\n        ...(req.user?.mobile ? [{ mobile: req.user.mobile }] : []),\r\n      ];\r\n      query = candidates.length ? { $or: candidates } : { _id: req.user?.id };\r\n    } else {\r\n      query = id.length === 24 ? { _id: id } : { customerId: id };\r\n    }\r\n\r\n    const customer = await Customer.findOne(query);`
  );
} else if (content.includes('const query = id.length === 24 ? { _id: id } : { customerId: id };\n\n    const customer = await Customer.findOne(query);')) {
  content = content.replace(
    'const query = id.length === 24 ? { _id: id } : { customerId: id };\n\n    const customer = await Customer.findOne(query);',
    `let query;\n    if (id === 'me') {\n      const candidates = [\n        ...(req.user?.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),\n        ...(req.user?.customerId ? [{ customerId: req.user.customerId }] : []),\n        ...(req.user?.mobile ? [{ mobile: req.user.mobile }] : []),\n      ];\n      query = candidates.length ? { $or: candidates } : { _id: req.user?.id };\n    } else {\n      query = id.length === 24 ? { _id: id } : { customerId: id };\n    }\n\n    const customer = await Customer.findOne(query);`
  );
}

// 2. Add upgradePlan and extendSubscription before module.exports
const extraFunctions = `
// Upgrade Plan
const upgradePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planName,
      milkQty,
      curdQty,
      frequency,
      milkType,
      actor,
    } = req.body;

    let query;
    if (id === 'me') {
      const candidates = [
        ...(req.user?.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),
        ...(req.user?.customerId ? [{ customerId: req.user.customerId }] : []),
        ...(req.user?.mobile ? [{ mobile: req.user.mobile }] : []),
        ...(req.user?.email ? [{ email: req.user.email }] : []),
        ...(req.body?.mobile ? [{ mobile: req.body.mobile }] : []),
      ];
      query = candidates.length ? { $or: candidates } : { _id: req.user?.id };
    } else {
      query = id.length === 24 ? { _id: id } : { customerId: id };
    }

    let customer = await Customer.findOne(query);
    const newMilkQty = Number(milkQty) > 0 ? Number(milkQty) : (customer?.deliveryPlan?.milkQty || 1);
    const newCurdQty = Number(curdQty) >= 0 ? Number(curdQty) : (customer?.deliveryPlan?.curdQty || 0);
    const newFrequency = frequency || customer?.deliveryPlan?.frequency || 'daily';

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    if (!customer) {
      // Seamlessly create customer record for first-time subscribers
      const User = require('../models/User');
      const userDoc = req.user?.id && req.user.id.length === 24 ? await User.findById(req.user.id).lean() : null;
      const custName = req.body.name || req.body.customerName || userDoc?.name || req.user?.name || 'Customer';
      const custMobile = req.body.mobile || userDoc?.mobile || req.user?.mobile || '9999999999';
      const custEmail = req.body.email || userDoc?.email || req.user?.email || '';
      const custAddress = req.body.address || 'Doorstep Delivery';
      const custArea = req.body.area || 'Madhapur';

      const count = await Customer.countDocuments();
      const customerId = \`CUST-\${101 + count}\`;

      customer = new Customer({
        customerId,
        name: custName,
        mobile: custMobile,
        email: custEmail,
        address: custAddress,
        area: custArea,
        landmark: req.body.landmark || '',
        whatsapp: req.body.whatsapp || '',
        status: 'active',
        currentBalance: 0,
        deliveryPlan: {
          milkQty: newMilkQty,
          curdQty: newCurdQty,
          frequency: newFrequency,
          planName: planName || 'Daily Farm Pure Milk Plan',
          milkType: milkType || 'Pure A2 Cow Milk',
        },
        subscription: {
          status: 'active',
          startDate: new Date(),
          endDate: thirtyDaysLater,
        },
      });
    } else {
      if (req.body.address && typeof req.body.address === 'string' && req.body.address.trim()) {
        customer.address = req.body.address.trim();
      }
      if (req.body.area && typeof req.body.area === 'string' && req.body.area.trim()) {
        customer.area = req.body.area.trim();
      }
      if (req.body.landmark && typeof req.body.landmark === 'string' && req.body.landmark.trim()) {
        customer.landmark = req.body.landmark.trim();
      }
      if (req.body.whatsapp && typeof req.body.whatsapp === 'string' && req.body.whatsapp.trim()) {
        customer.whatsapp = req.body.whatsapp.trim();
      }

      customer.deliveryPlan = {
        ...(customer.deliveryPlan ? customer.deliveryPlan.toObject() : {}),
        milkQty: newMilkQty,
        curdQty: newCurdQty,
        frequency: newFrequency,
        planName: planName || customer.deliveryPlan?.planName || 'Daily Farm Pure Milk Plan',
        milkType: milkType || customer.deliveryPlan?.milkType || 'Pure A2 Cow Milk',
      };
      customer.status = 'active';
      if (!customer.subscription || !customer.subscription.endDate || new Date(customer.subscription.endDate) < new Date()) {
        customer.subscription = {
          ...(customer.subscription ? (customer.subscription.toObject ? customer.subscription.toObject() : customer.subscription) : {}),
          status: 'active',
          startDate: new Date(),
          endDate: thirtyDaysLater,
        };
      } else {
        customer.subscription.status = 'active';
      }
    }

    await customer.save();

    // Ensure a Subscription record exists in subscriptions collection
    const existingSub = await Subscription.findOne({
      $or: [{ customer: customer._id }, { customerId: customer.customerId }],
    });
    if (!existingSub) {
      await Subscription.create({
        customer: customer._id,
        customerId: customer.customerId,
        customerName: customer.name,
        status: 'active',
        amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),
        currency: 'INR',
        plan: {
          milkQty: newMilkQty,
          curdQty: newCurdQty,
          frequency: newFrequency,
          deliveryDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        deliveryAddress: customer.address || 'Doorstep Delivery',
        area: customer.area || 'Madhapur',
        startDate: new Date(),
        endDate: thirtyDaysLater,
      });
    } else {
      await Subscription.updateMany(
        { $or: [{ customer: customer._id }, { customerId: customer.customerId }], status: { $in: ['active', 'pending'] } },
        {
          $set: {
            'plan.milkQty': newMilkQty,
            'plan.curdQty': newCurdQty,
            'plan.frequency': newFrequency,
            status: 'active',
            updatedAt: new Date(),
          },
        }
      );
    }

    const today = formatDate();
    await ensureDeliveriesForDate(today);

    // Broadcast realtime updates to Admin, Delivery Partner, Customer
    broadcast('CUSTOMER_UPDATED', { id: customer._id.toString(), customerId: customer.customerId });
    broadcast('SUBSCRIPTION_UPDATED', { customerId: customer.customerId });
    broadcast('DELIVERY_UPDATED', {});

    return res.json({
      success: true,
      message: \`Plan upgraded to \${newMilkQty}L \${milkType || 'Milk'} (\${newFrequency}) successfully!\`,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
    });
  } catch (err) {
    console.error('upgradePlan error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Extend Subscription
const extendSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30, actor } = req.body;

    let query;
    if (id === 'me') {
      const candidates = [
        ...(req.user?.id && req.user.id.length === 24 ? [{ _id: req.user.id }] : []),
        ...(req.user?.customerId ? [{ customerId: req.user.customerId }] : []),
        ...(req.user?.mobile ? [{ mobile: req.user.mobile }] : []),
        ...(req.user?.email ? [{ email: req.user.email }] : []),
        ...(req.body?.mobile ? [{ mobile: req.body.mobile }] : []),
      ];
      query = candidates.length ? { $or: candidates } : { _id: req.user?.id };
    } else {
      query = id.length === 24 ? { _id: id } : { customerId: id };
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const numDays = Math.max(1, parseInt(days, 10) || 30);
    let baseDate = new Date();
    if (customer.subscription?.endDate && new Date(customer.subscription.endDate) > baseDate) {
      baseDate = new Date(customer.subscription.endDate);
    }
    const newEndDate = new Date(baseDate.getTime() + numDays * 24 * 60 * 60 * 1000);

    customer.subscription = {
      ...(customer.subscription || {}),
      status: 'active',
      startDate: customer.subscription?.startDate || new Date(),
      endDate: newEndDate,
    };
    customer.status = 'active';
    await customer.save();

    await Subscription.updateMany(
      { $or: [{ customer: customer._id }, { customerId: customer.customerId }], status: { $in: ['active', 'pending'] } },
      { $set: { endDate: newEndDate, status: 'active', updatedAt: new Date() } }
    );

    const today = formatDate();
    await ensureDeliveriesForDate(today);

    broadcast('CUSTOMER_UPDATED', { id: customer._id.toString(), customerId: customer.customerId });
    broadcast('SUBSCRIPTION_UPDATED', { customerId: customer.customerId });
    broadcast('DELIVERY_UPDATED', {});

    return res.json({
      success: true,
      message: \`Subscription extended by \${numDays} days!\`,
      customer: {
        ...customer.toObject(),
        id: customer._id.toString(),
      },
      newEndDate: newEndDate.toISOString(),
    });
  } catch (err) {
    console.error('extendSubscription error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
`;

if (!content.includes('const upgradePlan =')) {
  content = content.replace('module.exports = {', extraFunctions + '\nmodule.exports = {');
  content = content.replace(
    '  setTemporaryQty,',
    '  setTemporaryQty,\n  upgradePlan,\n  extendSubscription,'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated customerController.js!');
