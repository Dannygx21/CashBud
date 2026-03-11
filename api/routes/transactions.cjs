const express = require('express');
const Transaction = require('../../db/models/Transaction.model.cjs');

const router = express.Router();

// GET /api/transactions?month=2026-01&account=Amex Credit&category=Food
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) {
      const [year, month] = req.query.month.split('-').map(Number);
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt:  new Date(year, month, 1),
      };
    }
    if (req.query.account)  filter.account  = req.query.account;
    if (req.query.category) filter.category = req.query.category;

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('[transactions/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    console.error('[transactions/post]', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(transaction);
  } catch (err) {
    console.error('[transactions/put]', err);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[transactions/delete]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
