const express        = require('express');
const MonthlyExpense = require('../../db/models/MonthlyExpense.model.cjs');
const requireAuth    = require('../middleware/auth.cjs');

const router = express.Router();
router.use(requireAuth);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const base   = { userId: req.user.id };
    const filter = req.query.includeInactive === 'true' ? base : { ...base, isActive: true };
    const expenses = await MonthlyExpense.find(filter).sort({ amount: -1 });
    res.json(expenses);
  } catch (err) {
    console.error('[expenses/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const expense = await MonthlyExpense.create({ ...req.body, userId: req.user.id });
    res.status(201).json(expense);
  } catch (err) {
    console.error('[expenses/post]', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await MonthlyExpense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json(expense);
  } catch (err) {
    console.error('[expenses/put]', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;