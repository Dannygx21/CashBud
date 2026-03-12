const mongoose = require('mongoose');

const FREQUENCIES  = ['Monthly', 'Yearly'];
const PAYERS       = ['Daniel', 'Chloe', 'Taken Out of Paycheck', 'Paused', 'Split'];
const CATEGORIES   = ['Loan', 'Grocery', 'Savings', 'Health Care', 'Want', 'Car Insurance', 'Investments', 'Membership'];

const monthlyExpenseSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  amount:             { type: Number, required: true },
  category:           { type: String, enum: CATEGORIES, required: true },
  frequency:          { type: String, enum: FREQUENCIES, default: 'Monthly' },
  notes:              { type: String, default: '' },
  personPaying:       { type: String, enum: PAYERS, required: true },
  categoryPercentage: { type: Number, default: 0 },
  paused:             { type: Boolean, default: false },
  isActive:           { type: Boolean, default: true },
});

module.exports = mongoose.model('MonthlyExpense', monthlyExpenseSchema);
