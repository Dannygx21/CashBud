const express = require('express');
const Transaction = require('../../db/models/Transaction.model.cjs');

const router = express.Router();

const SPEND_CATEGORIES = [
  'Food', 'Wants', 'Grocery', 'Gas', 'Subscription',
  'Entertainment', 'Membership', 'Needs', 'Bill/Loan/Credit',
];

// GET /api/dashboard?year=2026
// Returns month-by-month overview matching the Year Overview sheet structure
router.get('/', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const transactions = await Transaction.find({
      date: {
        $gte: new Date(year, 0, 1),
        $lt:  new Date(year + 1, 0, 1),
      },
    });

    const months = Array.from({ length: 12 }, (_, i) => {
      const monthTxns = transactions.filter(t => new Date(t.date).getMonth() === i);

      const sumByCategory = (cats) =>
        monthTxns
          .filter(t => cats.includes(t.category) && t.crDr === 'Credit')
          .reduce((s, t) => s + t.amount, 0);

      const income = monthTxns
        .filter(t => t.category === 'Income' && t.crDr === 'Debit')
        .reduce((s, t) => s + t.amount, 0);

      const savings = monthTxns
        .filter(t => t.category === 'Savings' && t.crDr === 'Debit')
        .reduce((s, t) => s + t.amount, 0);

      const investments = monthTxns
        .filter(t => t.category === 'Investment' && t.crDr === 'Debit')
        .reduce((s, t) => s + t.amount, 0);

      const expenses = sumByCategory(SPEND_CATEGORIES);
      const netProfit = income - expenses;
      const totalSavings = savings + investments;
      const totalSavingsPct = income > 0 ? totalSavings / income : 0;

      return {
        month: i + 1,
        income,
        expenses,
        netProfit,
        totalSavings,
        totalSavingsPct,
        investments,
        categories: {
          income,
          savings,
          grocery:        sumByCategory(['Grocery']),
          gas:            sumByCategory(['Gas']),
          subscription:   sumByCategory(['Subscription']),
          entertainment:  sumByCategory(['Entertainment']),
          membership:     sumByCategory(['Membership']),
          wants:          sumByCategory(['Wants']),
          food:           sumByCategory(['Food']),
          billLoanCredit: sumByCategory(['Bill/Loan/Credit']),
          investment:     investments,
          needs:          sumByCategory(['Needs']),
        },
      };
    });

    res.json({ year, months });
  } catch (err) {
    console.error('[dashboard/get]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
