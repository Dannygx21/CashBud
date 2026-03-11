const express = require('express');
const Account = require('../../db/models/Account.model.cjs');

const router = express.Router();

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const filter = req.query.includeInactive === 'true' ? {} : { isActive: true };
    const accounts = await Account.find(filter).sort({ sortOrder: 1 });
    res.json(accounts);
  } catch (err) {
    console.error('[accounts/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/accounts/summary
router.get('/summary', async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true });

    const sum = (cat) =>
      accounts.filter(a => a.category === cat).reduce((s, a) => s + a.balance, 0);

    const cash        = sum('Checking');
    const savings     = sum('Savings');
    const investments = sum('Investments');
    const credit      = sum('Credit');
    const loans       = sum('Loan');
    const total       = cash + savings + investments - credit - loans;

    res.json({ total, cash, savings, investments, credit, loans });
  } catch (err) {
    console.error('[accounts/summary]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const account = await Account.create(req.body);
    res.status(201).json(account);
  } catch (err) {
    console.error('[accounts/post]', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    res.json(account);
  } catch (err) {
    console.error('[accounts/put]', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
