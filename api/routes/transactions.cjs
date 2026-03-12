const express    = require('express');
const mongoose   = require('mongoose');
const Transaction = require('../../db/models/Transaction.model.cjs');
const Account     = require('../../db/models/Account.model.cjs');

const router = express.Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Compute how much an account's balance changes from a single leg.
 *   Debit  account + Debit  crDr → +amount  (deposit / income)
 *   Debit  account + Credit crDr → -amount  (payment / transfer out)
 *   Credit account + Credit crDr → +amount  (purchase / more owed)
 *   Credit account + Debit  crDr → -amount  (payment / debt reduced)
 */
function balanceDelta(accountType, crDr, amount) {
  if (accountType === 'Debit') return crDr === 'Debit' ?  amount : -amount;
  return                               crDr === 'Credit' ? amount : -amount;
}

async function applyDelta(accountId, delta, session) {
  await Account.findByIdAndUpdate(
    accountId,
    { $inc: { balance: delta }, lastUpdated: new Date() },
    { session }
  );
}

// ─── GET /api/transactions ────────────────────────────────────────────────────
// ?month=2026-01  &accountId=<id>  &category=Food  &payPeriod=1/9+-+1/22
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
//
// Single leg:
//   { date, accountId, account, accountType, category, description, crDr, amount, payPeriod }
//
// Paired (payment / transfer) — pass a `paired` object with both legs:
//   {
//     paired: {
//       primary:   { accountId, account, accountType, category, description, crDr, amount },
//       secondary: { accountId, account, accountType, category, description, crDr, amount }
//     },
//     date, payPeriod
//   }
//
// Both legs share the same date and payPeriod. The route links them via linkedId
// and updates both account balances atomically.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { date, payPeriod = '', paired } = req.body;

    if (paired) {
      // ── Paired entry (credit card payment, savings transfer, etc.) ──────────
      const { primary, secondary } = paired;

      const [p, s] = await Transaction.insertMany(
        [
          { ...primary,   date, payPeriod },
          { ...secondary, date, payPeriod },
        ],
        { session }
      );

      // Link them to each other
      await Transaction.findByIdAndUpdate(p._id, { linkedId: s._id }, { session });
      await Transaction.findByIdAndUpdate(s._id, { linkedId: p._id }, { session });

      // Update both account balances
      await applyDelta(primary.accountId,   balanceDelta(primary.accountType,   primary.crDr,   primary.amount),   session);
      await applyDelta(secondary.accountId, balanceDelta(secondary.accountType, secondary.crDr, secondary.amount), session);

      await session.commitTransaction();
      session.endSession();

      // Return both with updated linkedIds
      const [pFinal, sFinal] = await Promise.all([
        Transaction.findById(p._id),
        Transaction.findById(s._id),
      ]);
      return res.status(201).json({ primary: pFinal, secondary: sFinal });
    }

    // ── Single leg ─────────────────────────────────────────────────────────────
    const { accountId, accountType, crDr, amount } = req.body;
    const [tx] = await Transaction.insertMany([{ ...req.body, date, payPeriod }], { session });
    await applyDelta(accountId, balanceDelta(accountType, crDr, amount), session);

    await session.commitTransaction();
    session.endSession();
    return res.status(201).json(tx);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[transactions/post]', err);
    res.status(400).json({ error: err.message });
  }
});

// ─── PUT /api/transactions/:id ────────────────────────────────────────────────
// Only non-financial fields (description, category, payPeriod) may be patched.
// To correct an amount, delete and re-enter.
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['description', 'category', 'payPeriod'];
    const update  = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );

    const tx = await Transaction.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(tx);
  } catch (err) {
    console.error('[transactions/put]', err);
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /api/transactions/:id ────────────────────────────────────────────
// Reverses the balance delta on the account. If the transaction has a linkedId,
// deletes and reverses the linked leg too.
router.delete('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tx = await Transaction.findById(req.params.id).session(session);
    if (!tx) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Reverse this leg
    const reverseDelta = -balanceDelta(tx.accountType, tx.crDr, tx.amount);
    await applyDelta(tx.accountId, reverseDelta, session);
    await Transaction.findByIdAndDelete(tx._id, { session });

    // Reverse and delete linked leg if present
    if (tx.linkedId) {
      const linked = await Transaction.findById(tx.linkedId).session(session);
      if (linked) {
        const linkedReverse = -balanceDelta(linked.accountType, linked.crDr, linked.amount);
        await applyDelta(linked.accountId, linkedReverse, session);
        await Transaction.findByIdAndDelete(linked._id, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();
    res.json({ deleted: true });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[transactions/delete]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
