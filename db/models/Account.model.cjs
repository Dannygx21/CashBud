const mongoose = require('mongoose');

const ACCOUNT_TYPES = ['Debit', 'Credit'];
const ACCOUNT_CATEGORIES = ['Checking', 'Credit', 'Savings', 'Investments', 'Loan'];

const accountSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    displayName: { type: String, required: true },
    institution: { type: String, required: true },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    category: { type: String, enum: ACCOUNT_CATEGORIES, required: true },
    balance: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
});

module.exports = mongoose.model('Account', accountSchema);