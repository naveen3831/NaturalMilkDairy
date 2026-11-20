const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    resetToken: {
      type: String,
      default: null,
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      default: 'customer',
    },
    accountName: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL auto-cleanup when expiresAt timestamp arrives
    },
  },
  {
    timestamps: true,
  }
);

// Ensure index exists
passwordResetOtpSchema.index({ email: 1, otp: 1 });
passwordResetOtpSchema.index({ email: 1, resetToken: 1 });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
