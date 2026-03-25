const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  email:              { type: String, required: true, unique: true, lowercase: true },
  passwordHash:       { type: String, required: true },
  role:               { type: String, enum: ['admin', 'member'], default: 'member' },
  color:              { type: String, default: '#6366f1' },
  incomePerPaycheck:   { type: Number, default: 0 },
  paycheckFrequency:   { type: String, enum: ['biweekly', 'weekly', 'bimonthly', 'monthly'], default: 'biweekly' },
  paycheckAnchorDate:  { type: Date, default: null },
  transactionGrouping: { type: String, enum: ['monthly', 'weekly', 'bimonthly', 'payperiod'], default: 'monthly' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
