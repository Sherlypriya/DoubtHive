const express = require('express');
const router = express.Router();
const {
  getPerks,
  getPerkById,
  redeemPerk,
  getMyRedemptions,
  adminGetAllPerks,
  adminCreatePerk,
  adminUpdatePerk,
  adminDeletePerk,
  adminGetRedemptions,
  adminUpdateRedemption,
} = require('../controllers/perkController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// Public: list active perks
router.get('/', getPerks);

// Private: user's own redemption history
router.get('/my-redemptions', protect, getMyRedemptions);

// Private: redeem a perk
router.post('/:id/redeem', protect, redeemPerk);

// Public: single perk details
router.get('/:id', getPerkById);

// Admin-only perk management
router.get('/admin/all', protect, requireRole('admin'), adminGetAllPerks);
router.post('/admin', protect, requireRole('admin'), adminCreatePerk);
router.patch('/admin/:id', protect, requireRole('admin'), adminUpdatePerk);
router.delete('/admin/:id', protect, requireRole('admin'), adminDeletePerk);

// Admin-only redemption management
router.get('/admin/redemptions', protect, requireRole('admin'), adminGetRedemptions);
router.patch('/admin/redemptions/:id', protect, requireRole('admin'), adminUpdateRedemption);

module.exports = router;
