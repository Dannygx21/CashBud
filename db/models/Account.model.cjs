const mongoose = require('mongoose');

const ACCOUNT_TYPES = ['Debit', 'Credit'];
const ACCOUNT_CATEGORIES = ['Checking', 'Credit', 'Savings', 'Investments', 'Loan'];

const accountSchema = new mongoose.Schema({
    name: { type: String, required: true },           // e.g. "Amex Credit"
    displayName: { type: String },                     // e.g. "Amex Credit Card"
    institution: { type: String, required: true },     // e.g. "Amex", "SoFi", "Navy Fed"
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    category: { type: String, enum: ACCOUNT_CATEGORIES, required: true },
    balance: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
});

module.exports = mongoose.model('Account', accountSchema);