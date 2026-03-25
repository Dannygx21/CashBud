const express     = require('express');
const bcrypt      = require('bcryptjs');
const User        = require('../../db/models/User.model.cjs');
const requireAuth = require('../middleware/auth.cjs');

const router = express.Router();
router.use(requireAuth);

// ─── GET /api/profile ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('[profile/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const allowed = ['name', 'incomePerPaycheck', 'paycheckFrequency', 'paycheckAnchorDate', 'transactionGrouping', 'color'];
    const update  = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    // Optional password change
    if (req.body.password) {
      update.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('[profile/put]', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;