const express     = require('express');
const Transaction = require('../../db/models/Transaction.model.cjs');
const Account     = require('../../db/models/Account.model.cjs');
const requireAuth = require('../middleware/auth.cjs');

const router = express.Router();
router.use(requireAuth);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function balanceDelta(accountType, crDr, amount) {
  if (accountType === 'Debit') return crDr === 'Debit' ?  amount : -amount;
  return                               crDr === 'Credit' ? amount : -amount;
}

async function applyDelta(accountId, delta) {
  await Account.findByIdAndUpdate(
    accountId,
    { $inc: { balance: delta }, lastUpdated: new Date() }
  );
}

// ─── GET /api/transactions ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.id };

    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    } else if (req.query.month) {
      const [year, month] = req.query.month.split('-').map(Number);
      filter.date = {
        $gte: new Date(Date.UTC(year, month - 1, 1)),
        $lt:  new Date(Date.UTC(year, month, 1)),
      };
    }
    if (req.query.accountId) filter.accountId = req.query.accountId;
    if (req.query.category)  filter.category  = req.query.category;
    if (req.query.payPeriod) filter.payPeriod = req.query.payPeriod;

    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('[transactions/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/transactions ───────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { date, payPeriod = '', paired } = req.body;
    const userId = req.user.id;

    if (paired) {
      const { primary, secondary } = paired;

      const p = await Transaction.create({ ...primary, date, payPeriod, userId });
      const s = await Transaction.create({ ...secondary, date, payPeriod, userId });

      p.linkedId = s._id;
      s.linkedId = p._id;
      await Promise.all([p.save(), s.save()]);

      await applyDelta(primary.accountId,   balanceDelta(primary.accountType,   primary.crDr,   primary.amount));
      await applyDelta(secondary.accountId, balanceDelta(secondary.accountType, secondary.crDr, secondary.amount));

      return res.status(201).json({ primary: p, secondary: s });
    }

    const { accountId, accountType, crDr, amount } = req.body;
    const tx = await Transaction.create({ ...req.body, date, payPeriod, userId });
    await applyDelta(accountId, balanceDelta(accountType, crDr, amount));

    return res.status(201).json(tx);

  } catch (err) {
    console.error('[transactions/post]', err);
    res.status(400).json({ error: err.message });
  }
});

// ─── PUT /api/transactions/:id ────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['description', 'category', 'payPeriod', 'date'];
    const update  = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(tx);
  } catch (err) {
    console.error('[transactions/put]', err);
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /api/transactions/:id ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    await applyDelta(tx.accountId, -balanceDelta(tx.accountType, tx.crDr, tx.amount));
    await tx.deleteOne();

    if (tx.linkedId) {
      const linked = await Transaction.findById(tx.linkedId);
      if (linked) {
        await applyDelta(linked.accountId, -balanceDelta(linked.accountType, linked.crDr, linked.amount));
        await linked.deleteOne();
      }
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('[transactions/delete]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;