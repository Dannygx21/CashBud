const mongoose = require('mongoose');

const ACCOUNT_TYPES = ['Debit', 'Credit'];
const CR_DR         = ['Credit', 'Debit'];
const CATEGORIES    = [
  'Income', 'Food', 'Wants', 'Grocery', 'Gas',
  'Subscription', 'Entertainment', 'Membership', 'Needs',
  'Bill/Loan/Credit', 'Investment', 'Savings', 'Balance', 'Transaction',
];

const transactionSchema = new mongoose.Schema({
  date:        { type: Date, required: true },
  account:     { type: String, required: true },
  accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
  category:    { type: String, enum: CATEGORIES, required: true },
  description: { type: String, required: true },
  crDr:        { type: String, enum: CR_DR, required: true },
  amount:      { type: Number, required: true },
});

module.exports = mongoose.model('Transaction', transactionSchema);
