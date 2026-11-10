const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'NATURAL MILK DAIRY PRIVATE LIMITED',
      trim: true,
    },
    tagline: {
      type: String,
      default: 'Natural • Pure • Healthy',
      trim: true,
    },
    description: {
      type: String,
      default:
        'Delivering pure farm-fresh unpasteurized milk and authentic dairy products directly to your doorstep across Mumbai.',
      trim: true,
    },
    address: {
      type: String,
      default:
        'Natural Milk Dairy, Unit 12/B, Knowledge Park Rd, Near WEH, Andheri West, Mumbai, Maharashtra 400053',
      trim: true,
    },
    city: {
      type: String,
      default: 'Mumbai',
      trim: true,
    },
    state: {
      type: String,
      default: 'Maharashtra',
      trim: true,
    },
    pincode: {
      type: String,
      default: '400053',
      trim: true,
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    cleanPhone: {
      type: String,
      default: '919876543210',
      trim: true,
    },
    email: {
      type: String,
      default: 'care@naturalmilkdairy.com',
      trim: true,
      lowercase: true,
    },
    whatsapp: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    workingHours: {
      type: String,
      default: '5:00 AM – 9:00 PM Daily (365 Days)',
      trim: true,
    },
    deliveryHours: {
      type: String,
      default: '5:00 AM – 6:30 AM Doorstep Drop',
      trim: true,
    },
    socialLinks: {
      facebook: {
        type: String,
        default: 'https://facebook.com',
        trim: true,
      },
      twitter: {
        type: String,
        default: 'https://twitter.com',
        trim: true,
      },
      linkedin: {
        type: String,
        default: 'https://linkedin.com',
        trim: true,
      },
      instagram: {
        type: String,
        default: 'https://instagram.com',
        trim: true,
      },
      youtube: {
        type: String,
        default: 'https://youtube.com',
        trim: true,
      },
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: String,
      default: 'Admin Desk',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ContactInfo || mongoose.model('ContactInfo', contactInfoSchema);
