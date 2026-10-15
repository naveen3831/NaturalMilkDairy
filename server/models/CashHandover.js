const mongoose = require('mongoose');

const cashHandoverSchema = new mongoose.Schema(
  {
    deliveryBoyId: { type: String, required: true },
    deliveryBoyName: { type: String, required: true },
    deliveryBoyMobile: { type: String, default: '' },
    assignedArea: { type: String, default: '' },
    amount: { type: Number, required: true },
    physicalCashCollected: { type: Number, default: 0 },
    upiCollected: { type: Number, default: 0 },
    handoverMethod: {
      type: String,
      enum: ['cash', 'dairy_counter', 'bank_deposit', 'upi_to_admin'],
      default: 'cash',
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    verifiedBy: { type: String, default: '' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, default: '' },
    handoverDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CashHandover || mongoose.model('CashHandover', cashHandoverSchema);
