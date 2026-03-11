/**
 * Seed script — imports all data from your 2026_Budget_Buddy.xlsx
 * Run: node scripts/seed.js
 * Requires MONGO_URI in .env
 */
const path = require('path');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env')
    : path.resolve(__dirname, '../.env.local'),
})
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Account = require('../db/models/Account.model.cjs');
const MonthlyExpense = require('../db/models/MonthlyExpense.model.cjs');
const User = require('../db/models/User.model.cjs');

const { connectToMongo } = require('../db/connect.cjs')

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { name: 'Amex', institution: 'Amex', displayName: 'Amex Checking', type: 'Debit', category: 'Checking', balance: 214.67 },
  { name: 'Amex', institution: 'Amex', displayName: 'Amex Credit', type: 'Credit', category: 'Credit', balance: 4686.09 },
  { name: 'SoFi', institution: 'SoFi', displayName: 'SoFi Checking', type: 'Debit', category: 'Checking', balance: 7030.27 },
  { name: 'SoFi', institution: 'SoFi', displayName: 'SoFi HYSA', type: 'Debit', category: 'Savings', balance: 631.45 },
  { name: 'Amex', institution: 'Amex', displayName: 'Amex HYSA', type: 'Debit', category: 'Savings', balance: 6526.98 },
  { name: 'Navy Fed', institution: 'Navy Fed', displayName: 'Navy Fed 4SN', type: 'Debit', category: 'Checking', balance: 2956.22 },
  { name: 'Navy Fed', institution: 'Navy Fed', displayName: 'Navy Fed EF', type: 'Debit', category: 'Savings', balance: 1592.92 },
  { name: 'Navy Fed', institution: 'Navy Fed', displayName: 'Navy Fed Roth IRA', type: 'Debit', category: 'Investments', balance: 4264.24 },
  { name: 'Navy Fed', institution: 'Navy Fed', displayName: 'Wife Credit', type: 'Credit', category: 'Credit', balance: 792.84 },
  { name: 'Citi', institution: 'Citi', displayName: 'Citi Credit', type: 'Credit', category: 'Credit', balance: 454.25 },
  { name: 'Clasp', institution: 'Clasp', displayName: 'Student Loan', type: 'Credit', category: 'Loan', balance: 6460.00 },
  { name: 'Patient Fi', institution: 'Patient Fi', displayName: 'Laser Big', type: 'Credit', category: 'Loan', balance: 8327.18 },
  { name: 'Alphaeon', institution: 'Alphaeon', displayName: 'Laser Small', type: 'Credit', category: 'Credit', balance: 1403.00 },
  { name: 'Best Buy', institution: 'Best Buy', displayName: 'Best Buy Credit', type: 'Credit', category: 'Credit', balance: 2404.70 },
  { name: 'Fidelity', institution: 'Fidelity', displayName: 'Fidelity Investments', type: 'Debit', category: 'Investments', balance: 0 },
  { name: 'Vanguard', institution: 'Vanguard', displayName: '401K', type: 'Debit', category: 'Investments', balance: 1921.06 },
  { name: 'TSP', institution: 'TSP', displayName: 'TSP', type: 'Debit', category: 'Investments', balance: 0 },
  { name: 'Toyota Financial', institution: 'Toyota Financial', displayName: 'Corolla Hatchback', type: 'Credit', category: 'Loan', balance: 34029.15 },
  { name: 'T-Mobile', institution: 'T-Mobile', displayName: "Wife's iPhone", type: 'Credit', category: 'Credit', balance: -84.58, notes: 'Total: 1,015' },
].map((a, i) => ({ ...a, sortOrder: i, lastUpdated: new Date('2026-01-20'), isActive: true }));

// ─── MONTHLY EXPENSES ─────────────────────────────────────────────────────────
// paused is explicit on every record — never relying on spread defaults
const EXPENSES = [
  { name: 'Student Loan', amount: 791.66, category: 'Loan', frequency: 'Monthly', notes: 'End of Payments in October 2026', personPaying: 'Daniel', paused: false },
  { name: 'Corolla Hatchback', amount: 573.47, category: 'Loan', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: 'Estimate Grocery Expense', amount: 467.11, category: 'Grocery', frequency: 'Monthly', notes: 'Based on average from 2025', personPaying: 'Daniel', paused: false },
  { name: 'SoFi HYSA', amount: 300.00, category: 'Savings', frequency: 'Monthly', notes: '$252.27 per paycheck', personPaying: 'Daniel', paused: false },
  { name: 'Navy Fed IRA', amount: 300.00, category: 'Savings', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: 'Health Care', amount: 288.88, category: 'Health Care', frequency: 'Monthly', notes: '$144.44 Per Paycheck', personPaying: 'Taken Out of Paycheck', paused: false },
  { name: 'Amex HYSA', amount: 258.27, category: 'Savings', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: 'Big Laser', amount: 241.92, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: "Wife's iPad", amount: 115.00, category: 'Want', frequency: 'Monthly', notes: '12 Payments', personPaying: 'Daniel', paused: false },
  { name: 'Navy Fed EF', amount: 100.00, category: 'Savings', frequency: 'Monthly', notes: 'Goal: 6 months expenses $16,287.36', personPaying: 'Daniel', paused: false },
  { name: 'Progressive', amount: 85.33, category: 'Car Insurance', frequency: 'Monthly', notes: '$515 for 6 months', personPaying: 'Daniel', paused: false },
  { name: 'Small Laser', amount: 75.00, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Chloe', paused: false },
  { name: '401K', amount: 73.08, category: 'Investments', frequency: 'Monthly', notes: '$36.54 per Paycheck', personPaying: 'Taken Out of Paycheck', paused: false },
  { name: 'Fidelity', amount: 68.65, category: 'Investments', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: "Wife's Phone", amount: 42.29, category: 'Want', frequency: 'Monthly', notes: '24 Payments', personPaying: 'Daniel', paused: false },
  { name: 'Disney +', amount: 29.99, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Chloe', paused: false },
  { name: 'Amex Membership', amount: 27.09, category: 'Membership', frequency: 'Yearly', notes: 'Find Yearly Price', personPaying: 'Daniel', paused: false },
  { name: 'Daniel Gym', amount: 26.99, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: true },
  { name: 'Chloe Gym', amount: 26.99, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Chloe', paused: true },
  { name: 'Spotify', amount: 18.01, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Chloe', paused: false },
  { name: 'Udemy Subscription', amount: 14.84, category: 'Want', frequency: 'Yearly', notes: '$178.08 Per Year', personPaying: 'Daniel', paused: false },
  { name: 'PSN', amount: 13.33, category: 'Want', frequency: 'Yearly', notes: '$160 per Year', personPaying: 'Daniel', paused: false },
  { name: 'Peacock', amount: 11.65, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Chloe', paused: false },
  { name: 'Prime Membership', amount: 11.58, category: 'Want', frequency: 'Yearly', notes: '$139 per Year', personPaying: 'Daniel', paused: false },
  { name: 'Epoch', amount: 9.99, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: 'ChatGPT', amount: 8.48, category: 'Want', frequency: 'Monthly', notes: '', personPaying: 'Daniel', paused: false },
  { name: 'CoPilot', amount: 8.33, category: 'Want', frequency: 'Yearly', notes: '$100 Per Year', personPaying: 'Daniel', paused: false },
  { name: 'Costco Membership', amount: 5.42, category: 'Membership', frequency: 'Yearly', notes: '$65 per Year', personPaying: 'Daniel', paused: false },
  { name: 'Paramount +', amount: 5.30, category: 'Want', frequency: 'Yearly', notes: '$119.99/yr; 50% Discount: $63.59/yr', personPaying: 'Chloe', paused: false },
  { name: 'AMC Stubs Membership', amount: 1.50, category: 'Membership', frequency: 'Yearly', notes: '$17.99 Per Year', personPaying: 'Chloe', paused: false },
  { name: 'Mac Mini', amount: 35.00, category: 'Want', frequency: 'Monthly', notes: '18 months of payments ($630 total)', personPaying: 'Daniel', paused: false },
].map((e, i) => ({ isActive: true, sortOrder: i, ...e }));

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  await connectToMongo("Successfully connected to mongo for seed", "FAILED SEED Mongo Connection")

  // Clear existing data
  await Promise.all([
    Account.deleteMany({}),
    MonthlyExpense.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log('Cleared existing accounts, expenses, users');

  // Create users
  const [daniel, chloe] = await Promise.all([
    User.create({
      name: 'Daniel',
      email: 'daniel@home.local',
      passwordHash: await bcrypt.hash('changeme123', 12),
      incomePerPaycheck: 2500.34,
      paycheckFrequency: 'biweekly',
      role: 'admin',
      color: '#6366f1',
    }),
    User.create({
      name: 'Chloe',
      email: 'chloe@home.local',
      passwordHash: await bcrypt.hash('changeme123', 12),
      incomePerPaycheck: 1296.14,
      paycheckFrequency: 'biweekly',
      role: 'member',
      color: '#ec4899',
    }),
  ]);
  console.log(`Created users: ${daniel.email}, ${chloe.email}`);

  // Seed accounts
  await Account.insertMany(ACCOUNTS);
  console.log(`Seeded ${ACCOUNTS.length} accounts`);

  // Seed monthly expenses
  await MonthlyExpense.insertMany(EXPENSES);
  console.log(`Seeded ${EXPENSES.length} monthly expenses`);

  console.log('\n✅ Seed complete!');
  console.log('Default passwords are "changeme123" — change them after first login.');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
