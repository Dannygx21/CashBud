/**
 * One-time import: January 2026 transactions
 *
 * Run:  node seed/importJanuary.cjs
 *
 * - Does NOT update account balances (historical import — balances already set)
 * - Paired transactions (payment + source) are linked via linkedId
 * - Date assignment:
 *     Period 1 (12/26–1/8)  → 2026-01-01
 *     Period 2 (1/9–1/22)   → 2026-01-20
 *     Period 3 (1/23–2/5)   → 2026-02-01
 */

const path = require('path');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env')
    : path.resolve(__dirname, '../.env.local'),
});

const mongoose    = require('mongoose');
const Transaction = require('../db/models/Transaction.model.cjs');
const Account     = require('../db/models/Account.model.cjs');
const User        = require('../db/models/User.model.cjs');
const { connectToMongo } = require('../db/connect.cjs');

// ─── Period dates & labels ─────────────────────────────────────────────────────

const PERIODS = {
  1: { date: new Date('2026-01-01'), label: '12/26 - 1/8'  },
  2: { date: new Date('2026-01-20'), label: '1/9 - 1/22'   },
  3: { date: new Date('2026-02-01'), label: '1/23 - 2/5'   },
};

// ─── Single-entry transactions ─────────────────────────────────────────────────
// All rows that are NOT part of a paired transfer.
// { period, account, category, description, crDr, amount }

const SINGLES = [
  // ── Period 1 (12/26–1/8) ─────────────────────────────────────────────────
  { period: 1, account: 'SoFi Checking',  category: 'Income',           description: 'SAIC',                    crDr: 'Debit',  amount: 2522.72 },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 25.16   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'ULTA',                    crDr: 'Credit', amount: 115.01  },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'TJ MAXX',                 crDr: 'Credit', amount: 74.23   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Taco Bell',               crDr: 'Credit', amount: 50.88   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'H&M',                     crDr: 'Credit', amount: 71.18   },
  { period: 1, account: 'Amex Credit',    category: 'Needs',            description: 'CVS',                     crDr: 'Credit', amount: 41.01   },
  { period: 1, account: 'Laser Big',      category: 'Bill/Loan/Credit', description: 'Laser Big',               crDr: 'Debit',  amount: 241.92  },
  { period: 1, account: 'Citi Credit',    category: 'Gas',              description: 'Shell',                   crDr: 'Credit', amount: 21.57   },
  { period: 1, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 55.00   },
  { period: 1, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 30.00   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Chic Fil A',              crDr: 'Credit', amount: 36.30   },
  { period: 1, account: 'Amex Credit',    category: 'Subscription',     description: 'AWS',                     crDr: 'Credit', amount: 1.65    },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Shake Shack',             crDr: 'Credit', amount: 62.12   },
  { period: 1, account: 'Amex Credit',    category: 'Needs',            description: 'Navy Exchange',           crDr: 'Credit', amount: 20.00   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'MDEZPASS',                crDr: 'Credit', amount: 125.00  },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 22.01   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'CVS',                     crDr: 'Credit', amount: 26.98   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Target',                  crDr: 'Credit', amount: 19.01   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Hudson Wine',             crDr: 'Credit', amount: 45.48   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Canard',                  crDr: 'Credit', amount: 34.90   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Visenta Pictures',        crDr: 'Credit', amount: 42.54   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Double Tree',             crDr: 'Credit', amount: 18.06   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Noches De Colombia',      crDr: 'Credit', amount: 173.53  },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Double Tree',             crDr: 'Credit', amount: 435.80  },
  { period: 1, account: 'Amex Credit',    category: 'Subscription',     description: 'Pure Fitness',            crDr: 'Credit', amount: 6.34    },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Popeyes',                 crDr: 'Credit', amount: 15.87   },
  { period: 1, account: 'Amex Credit',    category: 'Food',             description: 'Metlife',                 crDr: 'Credit', amount: 31.99   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Target',                  crDr: 'Credit', amount: 22.90   },
  { period: 1, account: 'SoFi Checking',  category: 'Income',           description: 'Christmas',               crDr: 'Debit',  amount: 500.00  },
  { period: 1, account: 'SoFi Checking',  category: 'Wants',            description: 'Zelle (NY Beanie)',       crDr: 'Credit', amount: 45.00   },
  { period: 1, account: 'Citi Credit',    category: 'Gas',              description: 'Shell',                   crDr: 'Credit', amount: 17.57   },
  { period: 1, account: 'Citi Credit',    category: 'Gas',              description: 'BP',                      crDr: 'Credit', amount: 23.03   },
  { period: 1, account: 'Citi Credit',    category: 'Subscription',     description: 'Apple Sub',               crDr: 'Credit', amount: 84.79   },
  { period: 1, account: 'Citi Credit',    category: 'Gas',              description: 'Royal Farms',             crDr: 'Credit', amount: 22.97   },
  { period: 1, account: 'Citi Credit',    category: 'Subscription',     description: 'Epoch',                   crDr: 'Credit', amount: 9.99    },
  { period: 1, account: 'Amex Credit',    category: 'Needs',            description: 'Navy Exchange',           crDr: 'Credit', amount: 20.00   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 26.49   },
  { period: 1, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 70.00   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon Credit',           crDr: 'Debit',  amount: 26.49   }, // refund
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 38.15   },
  { period: 1, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 30.72   },
  { period: 1, account: 'SoFi Checking',  category: 'Income',           description: 'Promotion Bonus',         crDr: 'Debit',  amount: 300.00  },

  // ── Period 2 (1/9–1/22) ──────────────────────────────────────────────────
  { period: 2, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Drill Pay',               crDr: 'Debit',  amount: 644.76  },
  { period: 2, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 115.00  },
  { period: 2, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 55.00   },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 86.00   },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'SAIC',                    crDr: 'Debit',  amount: 2500.37 },
  { period: 2, account: 'SoFi Checking',  category: 'Food',             description: 'Zelle Payment',           crDr: 'Credit', amount: 70.00   },
  { period: 2, account: 'SoFi Checking',  category: 'Food',             description: 'Zelle Payment',           crDr: 'Credit', amount: 28.73   },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 264.00  },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 52.00   },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 30.00   },
  { period: 2, account: 'SoFi Checking',  category: 'Income',           description: 'Toyota Title Refund',     crDr: 'Debit',  amount: 142.00  },
  { period: 2, account: 'Amex Credit',    category: 'Needs',            description: 'Doctor Visit',            crDr: 'Credit', amount: 150.00  },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Chipotle',                crDr: 'Credit', amount: 21.55   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Chic Fil A',              crDr: 'Credit', amount: 25.83   },
  { period: 2, account: 'Amex Credit',    category: 'Grocery',          description: "Trader Joe's",            crDr: 'Credit', amount: 55.42   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'McDonalds',               crDr: 'Credit', amount: 7.20    },
  { period: 2, account: 'Amex Credit',    category: 'Subscription',     description: 'NFL Sunday Ticket',       crDr: 'Credit', amount: 39.75   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 23.84   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Papa Johns',              crDr: 'Credit', amount: 76.46   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 10.11   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Chipotle',                crDr: 'Credit', amount: 21.55   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'WAWA',                    crDr: 'Credit', amount: 18.52   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Three Rivers Concession', crDr: 'Credit', amount: 11.10   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Giant Eagle Wine',        crDr: 'Credit', amount: 18.18   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Giant Eagle Wine',        crDr: 'Credit', amount: 2.29    },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Acrisure Concession',     crDr: 'Credit', amount: 18.77   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Acrisure Concession',     crDr: 'Credit', amount: 16.15   },
  { period: 2, account: 'Amex Credit',    category: 'Needs',            description: 'Parking',                 crDr: 'Credit', amount: 60.00   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Acrisure Concession',     crDr: 'Credit', amount: 16.05   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Pamelas Diner',           crDr: 'Credit', amount: 20.72   },
  { period: 2, account: 'Amex Credit',    category: 'Needs',            description: 'Parking',                 crDr: 'Credit', amount: 8.00    },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Double Tree',             crDr: 'Credit', amount: 157.32  },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Chipotle',                crDr: 'Credit', amount: 37.53   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 121.85  },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 67.51   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 33.21   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Double Tree',             crDr: 'Credit', amount: 6.00    },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 24.37   },
  { period: 2, account: 'Amex Credit',    category: 'Subscription',     description: 'Udemy Subscription',      crDr: 'Credit', amount: 178.08  },
  { period: 2, account: 'Amex Credit',    category: 'Subscription',     description: 'Github Copilot',          crDr: 'Credit', amount: 100.00  },
  { period: 2, account: 'Amex Credit',    category: 'Entertainment',    description: 'Tattoo Convention Tickets', crDr: 'Credit', amount: 56.00 },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'MDEZPASS',                crDr: 'Credit', amount: 125.00  },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 16.44   },
  { period: 2, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 15.22   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 13.77   },
  { period: 2, account: 'Amex Credit',    category: 'Wants',            description: 'Express Lanes EZ pass toll', crDr: 'Credit', amount: 28.30 },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'Costco',                  crDr: 'Credit', amount: 13.51   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'WAWA',                    crDr: 'Credit', amount: 20.92   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'BP',                      crDr: 'Credit', amount: 26.85   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'Exxon',                   crDr: 'Credit', amount: 22.42   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'Shell',                   crDr: 'Credit', amount: 11.54   },
  { period: 2, account: 'Citi Credit',    category: 'Subscription',     description: 'oddfuture',               crDr: 'Credit', amount: 24.38   },
  { period: 2, account: 'Citi Credit',    category: 'Subscription',     description: 'oddfuture',               crDr: 'Credit', amount: 100.00  },
  { period: 2, account: 'Citi Credit',    category: 'Subscription',     description: 'oddfuture',               crDr: 'Credit', amount: 53.00   },
  { period: 2, account: 'Citi Credit',    category: 'Subscription',     description: 'oddfuture',               crDr: 'Credit', amount: 95.40   },
  { period: 2, account: 'Amex Credit',    category: 'Subscription',     description: 'Chatgpt',                 crDr: 'Credit', amount: 8.48    },
  { period: 2, account: 'Amex Credit',    category: 'Needs',            description: 'Navy Exchange',           crDr: 'Credit', amount: 20.00   },
  { period: 2, account: 'Amex HYSA',      category: 'Savings',          description: 'Interest',                crDr: 'Debit',  amount: 17.35   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'Costco',                  crDr: 'Credit', amount: 18.02   },
  { period: 2, account: 'Citi Credit',    category: 'Gas',              description: 'Shell',                   crDr: 'Credit', amount: 12.89   },

  // ── Period 3 (1/23–2/5) ──────────────────────────────────────────────────
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 24.00   },
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Drill Pay',               crDr: 'Debit',  amount: 224.92  },
  { period: 3, account: 'Amex Checking',  category: 'Wants',            description: 'Draftkings',              crDr: 'Credit', amount: 25.00   },
  { period: 3, account: 'Amex Credit',    category: 'Needs',            description: 'Parchment Transcript',    crDr: 'Credit', amount: 10.30   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Kindle',                  crDr: 'Credit', amount: 6.35    },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Kindle',                  crDr: 'Credit', amount: 9.53    },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Kindle',                  crDr: 'Credit', amount: 9.53    },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Stickers',                crDr: 'Credit', amount: 10.00   },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 20.72   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Tattoo Convention',       crDr: 'Credit', amount: 25.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Tattoo Convention',       crDr: 'Credit', amount: 6.00    },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Ice Donation',            crDr: 'Credit', amount: 12.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Ice Donation',            crDr: 'Credit', amount: 12.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Parking',                 crDr: 'Credit', amount: 38.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Tattoo Convention',       crDr: 'Credit', amount: 10.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 22.95   },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Chic fil a',              crDr: 'Credit', amount: 37.68   },
  { period: 3, account: 'Citi Credit',    category: 'Food',             description: 'Chipotle',                crDr: 'Credit', amount: 45.00   },
  { period: 3, account: 'Citi Credit',    category: 'Wants',            description: 'EZ Toll',                 crDr: 'Credit', amount: 22.50   },
  { period: 3, account: 'SoFi Checking',  category: 'Food',             description: 'Zelle Food',              crDr: 'Credit', amount: 35.00   },
  { period: 3, account: 'SoFi Checking',  category: 'Income',           description: 'SAIC',                    crDr: 'Debit',  amount: 2500.34 },
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Drill Pay',               crDr: 'Debit',  amount: 224.91  },
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 40.00   },
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Dividend',                crDr: 'Debit',  amount: 0.09    },
  { period: 3, account: 'Navy Fed 4SN',   category: 'Income',           description: 'Payback',                 crDr: 'Debit',  amount: 20.00   },
  { period: 3, account: 'Navy Fed EF',    category: 'Income',           description: 'Dividend',                crDr: 'Debit',  amount: 0.34    },
  { period: 3, account: 'Amex Checking',  category: 'Income',           description: 'Dividend',                crDr: 'Debit',  amount: 0.21    },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Eggspectation',           crDr: 'Credit', amount: 96.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'vSeeBox',                 crDr: 'Credit', amount: 396.00  },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin',                  crDr: 'Credit', amount: 15.76   },
  { period: 3, account: 'Amex Credit',    category: 'Subscription',     description: 'AWS',                     crDr: 'Credit', amount: 1.65    },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 50.00   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 105.95  },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'Amazon',                  crDr: 'Credit', amount: 66.59   },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Chipotle',                crDr: 'Credit', amount: 38.96   },
  { period: 3, account: 'Citi Credit',    category: 'Gas',              description: 'Shell',                   crDr: 'Credit', amount: 21.50   },
  { period: 3, account: 'Citi Credit',    category: 'Subscription',     description: 'Dirpy',                   crDr: 'Credit', amount: 9.99    },
  { period: 3, account: 'Citi Credit',    category: 'Wants',            description: 'License',                 crDr: 'Credit', amount: 75.00   },
  { period: 3, account: 'SoFi Checking',  category: 'Income',           description: 'Dividend',                crDr: 'Debit',  amount: 1.44    },
  { period: 3, account: 'SoFi HYSA',      category: 'Income',           description: 'Interest',                crDr: 'Debit',  amount: 1.98    },
  { period: 3, account: 'Amex Credit',    category: 'Balance',          description: 'Amazon Amex points',      crDr: 'Debit',  amount: 50.00   }, // unpaired rewards redemption
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'McDonalds',               crDr: 'Credit', amount: 25.73   },
  { period: 3, account: 'Amex Credit',    category: 'Wants',            description: 'EZ Pass',                 crDr: 'Credit', amount: 125.00  },
  { period: 3, account: 'Citi Credit',    category: 'Gas',              description: 'Costco',                  crDr: 'Credit', amount: 20.18   },
  { period: 3, account: 'Citi Credit',    category: 'Wants',            description: 'Apple',                   crDr: 'Credit', amount: 104.94  },
  { period: 3, account: 'Amex Credit',    category: 'Food',             description: 'Dunkin Credit',           crDr: 'Debit',  amount: 7.00    }, // refund → Debit
];

// ─── Paired transactions ───────────────────────────────────────────────────────
// primary  = destination (crDr Debit  — money received / debt reduced)
// secondary = source     (crDr Credit — money sent out)

const PAIRS = [
  // Period 1
  {
    period: 1,
    primary:   { account: 'SoFi HYSA',     category: 'Savings',          description: 'HYSA',                   crDr: 'Debit',  amount: 252.27 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'To SoFi HYSA',           crDr: 'Credit', amount: 252.27 },
  },
  {
    period: 1,
    primary:   { account: 'Student Loan',  category: 'Bill/Loan/Credit', description: 'Student Loan',           crDr: 'Debit',  amount: 791.66 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Student Loan Payment',   crDr: 'Credit', amount: 791.66 },
  },
  {
    period: 1,
    primary:   { account: "Wife's iPhone", category: 'Wants',            description: 'Payment',                crDr: 'Debit',  amount: 42.29  },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Wife Phone Payment',     crDr: 'Credit', amount: 42.29  },
  },

  // Period 2
  {
    period: 2,
    primary:   { account: 'Citi Credit',   category: 'Transaction',      description: 'Payment',                crDr: 'Debit',  amount: 832.35 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Payment to Citi Credit', crDr: 'Credit', amount: 832.35 },
  },
  {
    period: 2,
    primary:   { account: 'SoFi HYSA',     category: 'Savings',          description: 'HYSA',                   crDr: 'Debit',  amount: 250.04 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'HYSA Payment',           crDr: 'Credit', amount: 250.04 },
  },
  {
    period: 2,
    primary:   { account: 'Best Buy Credit', category: 'Transaction',    description: 'Best Buy Payment',       crDr: 'Debit',  amount: 65.00  },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Best Buy Payment',       crDr: 'Credit', amount: 65.00  },
  },
  {
    period: 2,
    // Money moves from SoFi HYSA → SoFi Checking; destination = Checking
    primary:   { account: 'SoFi Checking', category: 'Balance',          description: 'Movement to Checking',   crDr: 'Debit',  amount: 157.00 },
    secondary: { account: 'SoFi HYSA',     category: 'Transaction',      description: 'Movement to Checking',   crDr: 'Credit', amount: 157.00 },
  },
  {
    period: 2,
    primary:   { account: 'Corolla Hatchback', category: 'Bill/Loan/Credit', description: 'Toyota Payment',     crDr: 'Debit',  amount: 573.47 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Toyota Payment',         crDr: 'Credit', amount: 573.47 },
  },
  {
    period: 2,
    primary:   { account: 'Amex Credit',   category: 'Bill/Loan/Credit', description: 'Amex Credit Payment',   crDr: 'Debit',  amount: 3527.87 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Amex Credit Payment',   crDr: 'Credit', amount: 3527.87 },
  },
  {
    period: 2,
    primary:   { account: 'Amex HYSA',     category: 'Savings',          description: 'Monthly Payment',        crDr: 'Debit',  amount: 285.27 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Monthly Payment',        crDr: 'Credit', amount: 285.27 },
  },

  // Period 3
  {
    period: 3,
    primary:   { account: 'Laser Big',     category: 'Wants',            description: 'Big laser payment',      crDr: 'Debit',  amount: 241.92 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Big laser payment',      crDr: 'Credit', amount: 241.92 },
  },
  {
    period: 3,
    primary:   { account: 'SoFi HYSA',     category: 'Savings',          description: 'Monthly',                crDr: 'Debit',  amount: 250.04 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Monthly',                crDr: 'Credit', amount: 250.04 },
  },
  {
    period: 3,
    // Money moves from SoFi HYSA → SoFi Checking; destination = Checking
    primary:   { account: 'SoFi Checking', category: 'Balance',          description: 'Movement to SoFi checking', crDr: 'Debit', amount: 369.00 },
    secondary: { account: 'SoFi HYSA',     category: 'Savings',          description: 'Movement to SoFi checking', crDr: 'Credit', amount: 369.00 },
  },
  {
    period: 3,
    primary:   { account: 'Student Loan',  category: 'Bill/Loan/Credit', description: 'Monthly Payment',        crDr: 'Debit',  amount: 791.66 },
    secondary: { account: 'SoFi Checking', category: 'Balance',          description: 'Monthly Payment',        crDr: 'Credit', amount: 791.66 },
  },
];

// ─── Import ───────────────────────────────────────────────────────────────────

async function importJanuary() {
  await connectToMongo('Connected to MongoDB for January import', 'MongoDB connection FAILED');

  // Find Daniel
  const email  = process.env.USER1_EMAIL || 'daniel@home.local';
  const daniel = await User.findOne({ email });
  if (!daniel) throw new Error(`User not found: ${email}`);
  console.log(`Found user: ${daniel.name} (${daniel._id})`);

  // Build account map: displayName → { _id, type }
  const accountDocs = await Account.find({ userId: daniel._id });
  const accountMap  = new Map(accountDocs.map(a => [a.displayName, { _id: a._id, type: a.type }]));
  console.log(`Loaded ${accountMap.size} accounts`);

  function resolveAccount(name) {
    const acc = accountMap.get(name);
    if (!acc) throw new Error(`Account not found: "${name}"`);
    return acc;
  }

  function buildDoc(row, periodNum) {
    const { date, label } = PERIODS[periodNum];
    const acc = resolveAccount(row.account);
    return {
      userId:      daniel._id,
      date,
      accountId:   acc._id,
      account:     row.account,
      accountType: acc.type,
      category:    row.category,
      description: row.description,
      crDr:        row.crDr,
      amount:      row.amount,
      payPeriod:   label,
    };
  }

  let singles = 0;
  let pairs   = 0;

  // Insert singles
  for (const row of SINGLES) {
    await Transaction.create(buildDoc(row, row.period));
    singles++;
  }
  console.log(`Inserted ${singles} single transactions`);

  // Insert pairs with linkedId
  for (const pair of PAIRS) {
    const pDoc = buildDoc(pair.primary,   pair.period);
    const sDoc = buildDoc(pair.secondary, pair.period);

    const p = await Transaction.create(pDoc);
    const s = await Transaction.create(sDoc);

    p.linkedId = s._id;
    s.linkedId = p._id;
    await Promise.all([p.save(), s.save()]);

    pairs++;
  }
  console.log(`Inserted ${pairs} paired transactions (${pairs * 2} documents)`);
  console.log(`\nTotal documents created: ${singles + pairs * 2}`);
  console.log('January import complete.');

  await mongoose.disconnect();
}

importJanuary().catch(err => { console.error(err); process.exit(1); });
