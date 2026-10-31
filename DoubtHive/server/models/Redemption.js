const mongoose = require('mongoose');

// Tracks each time a user redeems a perk.
// Redemptions are permanent: once claimed they cannot be undone (by the user).
const redemptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    perkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Perk',
      required: true,
    },
    // Snapshot of the cost at redemption time so history stays accurate even
    // if the perk's cost is later updated by an admin.
    costAtRedemption: {
      type: Number,
      required: true,
    },
    // A random short code the student can present (simulated demo only)
    redemptionCode: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Compound index used by the "prevent duplicate redemption" check
redemptionSchema.index({ userId: 1, perkId: 1, status: 1 });
redemptionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Redemption', redemptionSchema);
