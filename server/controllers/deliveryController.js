const Delivery = require('../models/Delivery');
const Customer = require('../models/Customer');
const DeliveryBoy = require('../models/DeliveryBoy');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { recordAudit } = require('../services/auditService');
const { ensureDeliveriesForDate, formatDate } = require('../services/deliveryService');

// Get today's or selected date deliveries
const getDeliveries = async (req, res) => {
  try {
    const date = req.query.date || formatDate();
    const { status, deliveryBoyId, search } = req.query;

    // Auto-generate scheduled deliveries in MongoDB for this date
    await ensureDeliveriesForDate(date);

    const filter = { deliveryDate: date };

    if (deliveryBoyId && deliveryBoyId !== 'all') {
      filter.deliveryBoyId = deliveryBoyId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { customerName: { $regex: q, $options: 'i' } },
        { customerAddress: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
      ];
    }

    const list = await Delivery.find(filter).sort({ customerName: 1 }).lean();

    const total = list.length;
    const delivered = list.filter((d) => d.status === 'delivered').length;
    const pending = list.filter((d) => d.status === 'pending').length;
    const notDelivered = list.filter((d) => d.status === 'not_delivered').length;

    return res.json({
      success: true,
      date,
      summary: { total, delivered, pending, notDelivered },
      deliveries: list.map((d) => ({
        ...d,
        id: d._id.toString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mark delivery as Delivered
const markDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      actualMilk,
      actualCurd,
      paymentMethod,
      notes,
      actor,
      collectedAmount,
    } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    const customer = await Customer.findOne({
      $or: [{ customerId: delivery.customerId }, { _id: delivery.customerId.length === 24 ? delivery.customerId : null }],
    });

    const milk = actualMilk !== undefined ? Number(actualMilk) : delivery.plannedMilk;
    const curd = actualCurd !== undefined ? Number(actualCurd) : delivery.plannedCurd;
    const milkPrice = delivery.milkPrice || 60;
    const curdPrice = delivery.curdPrice || 30;

    const totalAmount = milk * milkPrice + (curd / 500) * curdPrice;
    const method = paymentMethod || delivery.paymentMethod || 'credit';

    delivery.actualMilk = milk;
    delivery.actualCurd = curd;
    delivery.totalAmount = totalAmount;
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.paymentMethod = method;
    delivery.paymentStatus = method === 'credit' ? 'credit' : 'paid';
    if (notes) delivery.notes = notes;
    await delivery.save();

    let newCustomerBalance = 0;

    if (customer) {
      if (method === 'credit') {
        customer.currentBalance += totalAmount;
        await customer.save();
        newCustomerBalance = customer.currentBalance;
      } else if (method === 'cash' || method === 'upi') {
        const paid = collectedAmount !== undefined ? Number(collectedAmount) : totalAmount;
        delivery.paymentAmount = paid;
        await delivery.save();

        const prevBal = customer.currentBalance;
        customer.currentBalance = prevBal + (totalAmount - paid);
        await customer.save();
        newCustomerBalance = customer.currentBalance;

        // Record Payment in MongoDB
        await Payment.create({
          customerId: customer.customerId || customer._id.toString(),
          customerName: customer.name,
          amount: paid,
          paymentMethod: method,
          paymentDate: new Date(),
          collectedBy: actor || delivery.deliveryBoyName || 'Delivery Boy',
          deliveryBoyId: delivery.deliveryBoyId,
          referenceNumber: `${method.toUpperCase()}-DELIVERY-${formatDate()}`,
          previousBalance: prevBal,
          newBalance: customer.currentBalance,
          notes: `Collected during delivery on ${delivery.deliveryDate}`,
          createdAt: new Date(),
        });

        // Update driver's daily cash
        if (delivery.deliveryBoyId) {
          const boyQuery = delivery.deliveryBoyId.length === 24 ? { _id: delivery.deliveryBoyId } : { mobile: delivery.deliveryBoyId };
          const boy = await DeliveryBoy.findOne(boyQuery);
          if (boy) {
            if (method === 'cash') boy.todayCashCollected = (boy.todayCashCollected || 0) + paid;
            if (method === 'upi') boy.todayUpiCollected = (boy.todayUpiCollected || 0) + paid;
            await boy.save();
          }
        }
      } else if (method === 'advance') {
        customer.currentBalance += totalAmount;
        await customer.save();
        newCustomerBalance = customer.currentBalance;
      }
    }

    await recordAudit(
      'Delivery Completed',
      actor || delivery.deliveryBoyName || 'Delivery Boy',
      `Delivered ${milk}L Milk + ${curd}g Curd to ${delivery.customerName} (₹${totalAmount} via ${method.toUpperCase()})`,
      'delivery'
    );

    // Send real-time notification to Admin
    try {
      await Notification.create({
        recipientRole: 'admin',
        title: '✅ Delivery Completed',
        message: `${actor || delivery.deliveryBoyName || 'Driver'} delivered ${milk}L Milk${curd > 0 ? ` + ${curd}g Curd` : ''} to ${delivery.customerName}. Collected: ₹${totalAmount} (${method.toUpperCase()}).`,
        type: 'delivery_completed',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          amount: totalAmount,
          method,
          driverName: delivery.deliveryBoyName || actor,
        },
      });
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    return res.json({
      success: true,
      message: 'Delivery marked completed successfully',
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
      customerBalance: newCustomerBalance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mark delivery as Not Delivered
const markNotDelivered = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    delivery.status = 'not_delivered';
    delivery.notDeliveredReason = reason || 'Customer Not Home';
    delivery.actualMilk = 0;
    delivery.actualCurd = 0;
    delivery.totalAmount = 0;
    delivery.deliveredAt = new Date();
    if (notes) delivery.notes = notes;
    await delivery.save();

    await recordAudit(
      'Delivery Marked Not Delivered',
      actor || delivery.deliveryBoyName || 'Delivery Boy',
      `${delivery.customerName} - Reason: ${delivery.notDeliveredReason}${notes ? ` (${notes})` : ''}`,
      'delivery'
    );

    // Send real-time notification to Admin
    try {
      await Notification.create({
        recipientRole: 'admin',
        title: '⚠️ Delivery Issue / Missed',
        message: `${actor || delivery.deliveryBoyName || 'Driver'} reported drop could not be completed for ${delivery.customerName}. Reason: ${delivery.notDeliveredReason}.`,
        type: 'delivery_missed',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          reason: delivery.notDeliveredReason,
          driverName: delivery.deliveryBoyName || actor,
        },
      });
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr.message);
    }

    return res.json({
      success: true,
      message: 'Delivery marked as Not Delivered (no charge applied)',
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Batch sync for offline mode
const batchSyncOfflineDeliveries = async (req, res) => {
  try {
    const { offlineActions } = req.body;

    if (!Array.isArray(offlineActions) || offlineActions.length === 0) {
      return res.json({ success: true, count: 0, message: 'No offline actions to sync' });
    }

    let syncedCount = 0;
    for (const item of offlineActions) {
      const query = item.id.length === 24 ? { _id: item.id } : { customerId: item.id };
      const delivery = await Delivery.findOne(query);
      if (!delivery) continue;

      if (item.type === 'delivered') {
        delivery.status = 'delivered';
        delivery.actualMilk = item.data?.actualMilk ?? delivery.plannedMilk;
        delivery.actualCurd = item.data?.actualCurd ?? delivery.plannedCurd;
        delivery.paymentMethod = item.data?.paymentMethod || 'credit';
        delivery.totalAmount = delivery.actualMilk * (delivery.milkPrice || 60) + (delivery.actualCurd / 500) * (delivery.curdPrice || 30);
        delivery.deliveredAt = item.data?.timestamp ? new Date(item.data.timestamp) : new Date();
        await delivery.save();
        syncedCount++;
      } else if (item.type === 'not_delivered') {
        delivery.status = 'not_delivered';
        delivery.notDeliveredReason = item.data?.reason || 'Customer Not Home';
        delivery.totalAmount = 0;
        await delivery.save();
        syncedCount++;
      }
    }

    await recordAudit('Offline Sync Completed', 'System', `Synced ${syncedCount} offline deliveries`, 'system');

    return res.json({
      success: true,
      count: syncedCount,
      message: `Successfully synchronized ${syncedCount} offline deliveries`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Assign delivery to delivery partner (sends notification to delivery partner)
const assignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId, deliveryBoyName, actor } = req.body;

    const query = id.length === 24 ? { _id: id } : { customerId: id };
    const delivery = await Delivery.findOne(query);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery record not found' });
    }

    delivery.deliveryBoyId = deliveryBoyId || '';
    delivery.deliveryBoyName = deliveryBoyName || '';
    await delivery.save();

    // Create notification for delivery partner
    try {
      await Notification.create({
        recipientRole: 'delivery_boy',
        recipientId: deliveryBoyId || '',
        title: '📦 New Delivery Assigned',
        message: `Dispatch Admin assigned customer ${delivery.customerName} (${delivery.plannedMilk}L Milk) at ${delivery.customerAddress || 'your route'} to your shift.`,
        type: 'delivery_assigned',
        data: {
          deliveryId: delivery._id.toString(),
          customerName: delivery.customerName,
          deliveryBoyId,
          deliveryBoyName,
        },
      });
    } catch (notifErr) {
      console.warn('Driver notification error:', notifErr.message);
    }

    await recordAudit(
      'Delivery Partner Assigned',
      actor || 'Admin',
      `Assigned ${delivery.customerName} to ${deliveryBoyName || 'partner'}`,
      'delivery'
    );

    return res.json({
      success: true,
      message: `Delivery assigned to ${deliveryBoyName || 'partner'} successfully`,
      delivery: {
        ...delivery.toObject(),
        id: delivery._id.toString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDeliveries,
  markDelivered,
  markNotDelivered,
  batchSyncOfflineDeliveries,
  assignDelivery,
};
