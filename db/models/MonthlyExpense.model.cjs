const mongoose = require('mongoose');

const FREQUENCIES  = ['Monthly', 'Yearly'];
const CATEGORIES   = ['Loan', 'Grocery', 'Savings', 'Health Care', 'Want', 'Car Insurance', 'Investments', 'Membership'];

const monthlyExpenseSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:               { type: String, required: true },
  amount:             { type: Number, required: true },
  category:           { type: String, enum: CATEGORIES, required: true },
  frequency:          { type: String, enum: FREQUENCIES, default: 'Monthly' },
  notes:              { type: String, default: '' },
  personPaying:       { type: String, default: '' },
  categoryPercentage: { type: Number, default: 0 },
  paused:             { type: Boolean, default: false },
  isActive:           { type: Boolean, default: true },
});

module.exports = mongoose.model('MonthlyExpense', monthlyExpenseSchema);
