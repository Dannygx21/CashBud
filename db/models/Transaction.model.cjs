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
  accountId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  account:     { type: String, required: true },        // denormalized display name
  accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
  category:    { type: String, enum: CATEGORIES, required: true },
  description: { type: String, required: true },
  crDr:        { type: String, enum: CR_DR, required: true },
  amount:      { type: Number, required: true },
  payPeriod:   { type: String, default: '' },           // e.g. "1/9 - 1/22"
  linkedId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
