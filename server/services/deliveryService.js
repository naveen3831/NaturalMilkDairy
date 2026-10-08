const Customer = require('../models/Customer');
const Delivery = require('../models/Delivery');

const formatDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (d = new Date()) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
};

const ensureDeliveriesForDate = async (dateStr = formatDate()) => {
  try {
    const targetDate = new Date(dateStr + 'T00:00:00');
    const dayName = getDayName(targetDate);
    const dayNumber = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));

    const customers = await Customer.find({ status: { $ne: 'inactive' } }).lean();

    for (const customer of customers) {
      // Check pause range
      if (customer.status === 'paused') {
        if (customer.pauseFrom && customer.pauseUntil) {
          if (dateStr >= customer.pauseFrom && dateStr <= customer.pauseUntil) {
            continue;
          }
        } else {
          continue;
        }
      }

      // Check delivery plan schedule
      const plan = customer.deliveryPlan || {};
      let shouldDeliver = false;

      if (plan.frequency === 'daily' || !plan.frequency) {
        shouldDeliver = true;
      } else if (plan.frequency === 'alternate') {
        shouldDeliver = dayNumber % 2 === 0;
      } else if (plan.frequency === 'selected' || plan.frequency === 'custom') {
        shouldDeliver = Array.isArray(plan.deliveryDays) && plan.deliveryDays.includes(dayName);
      }

      if (!shouldDeliver) continue;

      const custId = customer.customerId || customer._id.toString();

      // Check if delivery already exists in MongoDB
      const existing = await Delivery.findOne({
        customerId: custId,
        deliveryDate: dateStr,
      });

      if (!existing) {
        let milkQty = plan.milkQty || 1;
        let curdQty = plan.curdQty || 0;

        if (customer.temporaryQty && customer.temporaryQty.date === dateStr) {
          if (customer.temporaryQty.milkQty !== null && customer.temporaryQty.milkQty !== undefined) {
            milkQty = customer.temporaryQty.milkQty;
          }
          if (customer.temporaryQty.curdQty !== null && customer.temporaryQty.curdQty !== undefined) {
            curdQty = customer.temporaryQty.curdQty;
          }
        }

        const milkPrice = 60;
        const curdPrice = 30;
        const totalAmount = milkQty * milkPrice + (curdQty / 500) * curdPrice;
        const paymentType = customer.paymentInfo?.paymentType || 'credit';

        await Delivery.create({
          customerId: custId,
          customerName: customer.name,
          customerPhone: customer.mobile,
          customerAddress: customer.address,
          deliveryBoyId: plan.deliveryBoyId || '',
          deliveryBoyName: plan.deliveryBoyName || '',
          deliveryDate: dateStr,
          plannedMilk: milkQty,
          plannedCurd: curdQty,
          actualMilk: milkQty,
          actualCurd: curdQty,
          milkPrice,
          curdPrice,
          totalAmount,
          status: 'pending',
          notDeliveredReason: '',
          paymentStatus: paymentType === 'prepaid' ? 'advance' : 'credit',
          paymentAmount: 0,
          paymentMethod: paymentType === 'prepaid' ? 'advance' : 'credit',
          notes: customer.notes || '',
          deliveredAt: null,
          createdAt: new Date(),
        });
      }
    }
  } catch (err) {
    console.error('ensureDeliveriesForDate note:', err.message);
  }
};

module.exports = { ensureDeliveriesForDate, formatDate, getDayName };
