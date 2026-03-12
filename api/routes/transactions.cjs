const express     = require('express');
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

async function applyDelta(accountId, delta) {
  await Account.findByIdAndUpdate(
    accountId,
    { $inc: { balance: delta }, lastUpdated: new Date() }
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
  try {
    const { date, payPeriod = '', paired } = req.body;

    if (paired) {
      // ── Paired entry (credit card payment, savings transfer, etc.) ──────────
      const { primary, secondary } = paired;

      const p = await Transaction.create({ ...primary, date, payPeriod });
      const s = await Transaction.create({ ...secondary, date, payPeriod });

      // Link them to each other
      p.linkedId = s._id;
      s.linkedId = p._id;
      await Promise.all([p.save(), s.save()]);

      // Update both account balances
      await applyDelta(primary.accountId,   balanceDelta(primary.accountType,   primary.crDr,   primary.amount));
      await applyDelta(secondary.accountId, balanceDelta(secondary.accountType, secondary.crDr, secondary.amount));

      return res.status(201).json({ primary: p, secondary: s });
    }

    // ── Single leg ─────────────────────────────────────────────────────────────
    const { accountId, accountType, crDr, amount } = req.body;
    const tx = await Transaction.create({ ...req.body, date, payPeriod });
    await applyDelta(accountId, balanceDelta(accountType, crDr, amount));

    return res.status(201).json(tx);

  } catch (err) {
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
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found.' });

    // Reverse this leg
    await applyDelta(tx.accountId, -balanceDelta(tx.accountType, tx.crDr, tx.amount));
    await tx.deleteOne();

    // Reverse and delete linked leg if present
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
