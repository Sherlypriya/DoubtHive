const mongoose = require('mongoose');
const Perk = require('../models/Perk');
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const crypto = require('crypto');

// Helper: generate a short memorable redemption code (e.g. DH-A3F9)
const genCode = () => 'DH-' + crypto.randomBytes(2).toString('hex').toUpperCase();

// @route   GET /api/perks
// @access  Public (active perks only)
exports.getPerks = async (req, res, next) => {
  try {
    const perks = await Perk.find({ isActive: true }).sort({ cost: 1 });
    res.json({ perks });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/perks/:id
// @access  Public
exports.getPerkById = async (req, res, next) => {
  try {
    const perk = await Perk.findById(req.params.id);
    if (!perk || !perk.isActive) {
      return res.status(404).json({ message: 'Perk not found' });
    }
    res.json({ perk });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid perk id' });
    }
    next(error);
  }
};

// @route   POST /api/perks/:id/redeem
// @access  Private (student/faculty)
// Uses a MongoDB session for atomicity: reputation deduction + redemption
// record creation happen in one transaction so partial failures are impossible.
exports.redeemPerk = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const perk = await Perk.findById(req.params.id).session(session);
    if (!perk || !perk.isActive) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Perk not found or no longer available' });
    }

    // Check stock
    if (perk.totalStock !== null && perk.redeemedCount >= perk.totalStock) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'This perk is out of stock' });
    }

    const user = await User.findById(req.user.id).session(session);

    // Check sufficient reputation
    if (user.reputation < perk.cost) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Not enough XP — you need ${perk.cost} but only have ${user.reputation}`,
      });
    }

    // Prevent re-redeeming the same perk if one is already pending
    const existing = await Redemption.findOne({
      userId: req.user.id,
      perkId: perk._id,
      status: 'pending',
    }).session(session);
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({
        message: 'You already have a pending redemption for this perk',
        redemptionCode: existing.redemptionCode,
      });
    }

    // Deduct reputation
    user.reputation = Math.max(0, user.reputation - perk.cost);
    await user.save({ session });

    // Increment perk counter
    perk.redeemedCount += 1;
    await perk.save({ session });

    // Create redemption record
    const redemption = await Redemption.create(
      [{
        userId: req.user.id,
        perkId: perk._id,
        costAtRedemption: perk.cost,
        redemptionCode: genCode(),
        status: 'pending',
      }],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      message: `Perk redeemed! Present your code at ${perk.category === 'canteen' ? 'the canteen' : 'the relevant desk'}.`,
      redemptionCode: redemption[0].redemptionCode,
      newReputation: user.reputation,
      perk: {
        title: perk.title,
        description: perk.description,
        isDemo: perk.isDemo,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid perk id' });
    }
    next(error);
  } finally {
    session.endSession();
  }
};

// @route   GET /api/perks/my-redemptions
// @access  Private
exports.getMyRedemptions = async (req, res, next) => {
  try {
    const redemptions = await Redemption.find({ userId: req.user.id })
      .populate('perkId', 'title description cost category isDemo')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ redemptions });
  } catch (error) {
    next(error);
  }
};

// ===== ADMIN-ONLY ENDPOINTS =====

// @route   GET /api/perks/admin/all
// @access  Admin
exports.adminGetAllPerks = async (req, res, next) => {
  try {
    const perks = await Perk.find().sort({ createdAt: -1 });
    res.json({ perks });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/perks/admin
// @access  Admin
exports.adminCreatePerk = async (req, res, next) => {
  try {
    const { title, description, cost, category, totalStock, icon, isDemo } = req.body;
    if (!title || !description || !cost) {
      return res.status(400).json({ message: 'title, description, and cost are required' });
    }
    const perk = await Perk.create({
      title: title.trim(),
      description: description.trim(),
      cost: Number(cost),
      category: category || 'other',
      totalStock: totalStock ? Number(totalStock) : null,
      icon: icon || 'gift',
      isDemo: isDemo !== false,
    });
    res.status(201).json({ perk });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    next(error);
  }
};

// @route   PATCH /api/perks/admin/:id
// @access  Admin
exports.adminUpdatePerk = async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['title', 'description', 'cost', 'category', 'totalStock', 'isActive', 'icon', 'isDemo'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const perk = await Perk.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ perk });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid perk id' });
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation failed',
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    next(error);
  }
};

// @route   DELETE /api/perks/admin/:id
// @access  Admin
exports.adminDeletePerk = async (req, res, next) => {
  try {
    const perk = await Perk.findByIdAndDelete(req.params.id);
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ message: 'Perk deleted' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid perk id' });
    next(error);
  }
};

// @route   GET /api/perks/admin/redemptions
// @access  Admin — see all redemptions
exports.adminGetRedemptions = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = {};
    if (['pending', 'fulfilled', 'cancelled'].includes(status)) filter.status = status;
    const redemptions = await Redemption.find(filter)
      .populate('userId', 'name email role reputation')
      .populate('perkId', 'title cost')
      .sort({ createdAt: -1 })
      .limit(Math.min(200, parseInt(limit, 10) || 50));
    res.json({ redemptions });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/perks/admin/redemptions/:id
// @access  Admin — fulfil or cancel a redemption
exports.adminUpdateRedemption = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'status must be "fulfilled" or "cancelled"' });
    }

    const redemption = await Redemption.findById(req.params.id);
    if (!redemption) return res.status(404).json({ message: 'Redemption not found' });

    if (redemption.status !== 'pending') {
      return res.status(409).json({ message: `Redemption is already ${redemption.status}` });
    }

    if (status === 'cancelled') {
      // Refund reputation if cancelling
      await User.updateOne(
        { _id: redemption.userId },
        { $inc: { reputation: redemption.costAtRedemption } }
      );
      // Give back stock
      await Perk.updateOne(
        { _id: redemption.perkId },
        { $inc: { redeemedCount: -1 } }
      );
    }

    redemption.status = status;
    await redemption.save();

    res.json({ redemption, message: `Redemption ${status}` });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
    next(error);
  }
};
