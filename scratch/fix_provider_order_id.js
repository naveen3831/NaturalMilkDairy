const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'server', 'controllers', 'customerController.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldSubCreate = `    if (!existingSub) {
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
      });`;

const newSubCreate = `    if (!existingSub) {
      await Subscription.create({
        customer: customer._id,
        customerId: customer.customerId,
        customerName: customer.name,
        status: 'active',
        providerOrderId: req.body.orderId || \`sub_order_\${Date.now()}_\${customer.customerId || 'cust'}\`,
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
        landmark: customer.landmark || '',
        whatsapp: customer.whatsapp || '',
        startDate: new Date(),
        endDate: thirtyDaysLater,
      });`;

if (content.includes('amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),') && !content.includes('providerOrderId: req.body.orderId || `sub_order_')) {
  content = content.replace(
    'status: \'active\',\n        amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),',
    'status: \'active\',\n        providerOrderId: req.body.orderId || `sub_order_${Date.now()}_${customer.customerId || \'cust\'}`,\n        amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),'
  );
  content = content.replace(
    'status: \'active\',\r\n        amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),',
    'status: \'active\',\r\n        providerOrderId: req.body.orderId || `sub_order_${Date.now()}_${customer.customerId || \'cust\'}`,\r\n        amount: Math.round((newMilkQty * 60 + (newCurdQty / 500) * 30) * 30),'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed providerOrderId in customerController.js!');
