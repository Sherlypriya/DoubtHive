const mongoose = require('mongoose');

// A "perk" is a campus reward that students can redeem using their reputation points.
// Perks are created/managed by admins. They are clearly marked as simulated demo rewards.
const perkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Perk title is required'],
      trim: true,
      maxlength: [120, 'Perk title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Perk description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    cost: {
      type: Number,
      required: [true, 'Cost (in reputation points) is required'],
      min: [1, 'Cost must be at least 1 point'],
    },
    category: {
      type: String,
      enum: ['canteen', 'library', 'stationery', 'event', 'other'],
      default: 'other',
    },
    // Total redemptions available (null = unlimited)
    totalStock: {
      type: Number,
      default: null,
    },
    // How many times this perk has been redeemed
    redeemedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional badge icon identifier for the frontend
    icon: {
      type: String,
      default: 'gift',
    },
    // Labelled as simulated/demo perk for the UI
    isDemo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

perkSchema.index({ isActive: 1, cost: 1 });

// Virtual: is this perk still available (stock not exhausted)?
perkSchema.virtual('isAvailable').get(function () {
  if (!this.isActive) return false;
  if (this.totalStock === null) return true;
  return this.redeemedCount < this.totalStock;
});

perkSchema.set('toJSON', { virtuals: true });
perkSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Perk', perkSchema);
