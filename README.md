# CashBud

Personal finance tracker built around a double-entry bookkeeping model. Track accounts, log transactions, monitor monthly expenses, and view a year-over-year dashboard — all from a web app or directly from Google Sheets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js · Express 5 · CommonJS |
| Database | MongoDB Atlas (Mongoose 9) |
| Frontend | React 18 · React Router v6 · Tailwind CSS · Recharts |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Docker · nginx reverse proxy |
| Sheets | Google Apps Script |

---

## Project Structure

```
CashBud/
├── api/
│   ├── Dockerfile
│   ├── routes/
│   │   ├── auth.cjs
│   │   ├── accounts.cjs
│   │   ├── transactions.cjs
│   │   ├── expenses.cjs
│   │   └── dashboard.cjs
│   └── server.cjs
├── db/
│   ├── connect.cjs
│   └── models/
│       ├── Account.model.cjs
│       ├── Transaction.model.cjs
│       ├── MonthlyExpense.model.cjs
│       └── User.model.cjs
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api/client.js
│       ├── context/AuthContext.jsx
│       ├── components/layout/Layout.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Accounts.jsx
│           ├── Dashboard.jsx
│           ├── Transactions.jsx
│           └── Expenses.jsx
├── seed/
│   └── seed.cjs
├── sheets/
│   ├── CashBud.gs
│   └── TransactionSidebar.html
├── .dockerignore
├── .env.example
├── docker-compose.yml
└── package.json
```

---

## Environment Variables

Copy `.env.example` to `.env` (production) or `.env.local` (development) and fill in your values.

```env
# MongoDB
MONGO_URI=mongodb+srv://cluster0.xxxxx.mongodb.net
DB_DBNAME=budget-buddy
DB_USER=db_user
DB_PASS=your_password
DB_SOURCE=admin

# Server
PORT=3001
NODE_ENV=production

# Auth
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

# Google Sheets (optional)
SHEETS_API_KEY=replace_with_a_random_secret
```

The API selects the env file automatically:
- `NODE_ENV=production` → reads `.env`
- anything else → reads `.env.local`

---

## Local Development

**Prerequisites:** Node.js 20+, MongoDB Atlas account (or local instance)

```bash
# Install API dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start API (port 3001)
npm run dev

# Start frontend (port 3000, proxies /api to 3001)
cd frontend && npm start
```

Seed the database with default accounts, expenses, and users:

```bash
npm run seed
```

Default credentials after seeding:
- **Admin** — set in `seed/seed.cjs` under the Users array
- **Member** — second user in the same array

---

## API Reference

Base URL: `/api`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT |

### Accounts
| Method | Path | Description |
|---|---|---|
| GET | `/accounts` | All active accounts (sorted by sortOrder) |
| GET | `/accounts/summary` | Net worth breakdown by category |
| POST | `/accounts` | Create account |
| PUT | `/accounts/:id` | Update account |

### Transactions
| Method | Path | Description |
|---|---|---|
| GET | `/transactions` | List transactions — filterable by `?month=2026-01`, `accountId`, `category`, `payPeriod` |
| POST | `/transactions` | Create single or paired (payment/transfer) transaction |
| PUT | `/transactions/:id` | Patch `description`, `category`, or `payPeriod` |
| DELETE | `/transactions/:id` | Delete + reverse balance (deletes linked leg if paired) |

### Expenses
| Method | Path | Description |
|---|---|---|
| GET | `/expenses` | All monthly expenses (sorted by amount desc) |
| POST | `/expenses` | Create expense |
| PUT | `/expenses/:id` | Update expense |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard?year=2026` | Month-by-month income, expenses, savings, investments |

---

## Transaction Model

CashBud uses a **double-entry** pattern. Every multi-account event (payment, transfer) creates two linked transaction rows.

```
crDr logic:
  Debit account  + Debit  → balance +amount  (deposit / income)
  Debit account  + Credit → balance -amount  (payment out)
  Credit account + Credit → balance +amount  (purchase / more owed)
  Credit account + Debit  → balance -amount  (debt reduced)
```

**Single entry** — one row, one account balance updated.
**Paired entry** — two rows linked via `linkedId`, two account balances updated. Deleting either leg removes both.

### Categories

| Type | Categories |
|---|---|
| Income | `Income` |
| Savings | `Savings`, `Investment` |
| Spending | `Food`, `Wants`, `Grocery`, `Gas`, `Subscription`, `Entertainment`, `Membership`, `Needs`, `Bill/Loan/Credit` |
| Internal | `Balance` |

---

## Deployment (Docker + nginx)

### Build images

Run both commands from the **project root**:

```bash
docker build -f api/Dockerfile      -t cashbuddy-api      .
docker build -f frontend/Dockerfile -t cashbuddy-frontend  .
```

The frontend image bakes in `/cashbuddy` as the base path at build time. No runtime env vars needed for the frontend container.

### Run containers

```bash
# API
docker run -d \
  --name cashbuddy-api \
  --network portfolio-network \
  --env-file .env \
  --expose 3001 \
  --restart unless-stopped \
  cashbuddy-api

# Frontend
docker run -d \
  --name cashbuddy-frontend \
  --network portfolio-network \
  --expose 80 \
  --restart unless-stopped \
  cashbuddy-frontend
```

### Seed from container

```bash
# If the container is already running
docker exec cashbuddy-api node seed/seed.cjs

# One-off (container not required to be running)
docker run --rm --env-file .env cashbuddy-api node seed/seed.cjs
```

### nginx config

Add these blocks to your `portfolio.conf` **before** the root `location /` block:

```nginx
# CASHBUDDY API
location /cashbuddy/api/ {
    proxy_pass http://cashbuddy-api:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# CASHBUDDY FRONTEND
location /cashbuddy/ {
    proxy_pass http://cashbuddy-frontend:80/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The app will be available at `http://your-nas-ip/cashbuddy/`.

---

## Google Sheets Integration

The `sheets/` folder contains a Google Apps Script that connects the spreadsheet to the live database.

### Setup

1. Open your Google Sheet → **Extensions > Apps Script**
2. Create `Code.gs` — paste contents of `sheets/CashBud.gs`
3. Create an HTML file named `TransactionSidebar` — paste contents of `sheets/TransactionSidebar.html`
4. **Gear icon → Project Settings → Script Properties** — add:

| Key | Value |
|---|---|
| `API_BASE_URL` | Your deployed API URL (e.g. `https://your-nas-ip`) |
| `API_KEY` | Value of `SHEETS_API_KEY` from `.env` *(optional)* |

5. Save and reload the sheet — a **CashBud** menu appears

> **Local dev:** Google's servers cannot reach `localhost`. Use `npx ngrok http 3001` and set the generated `https://` URL as `API_BASE_URL`.

### Features

| Menu Item | Action |
|---|---|
| **⟳ Sync Accounts** | Pulls all accounts from the API, writes to an "Accounts" tab grouped by category with subtotals and a net worth summary |
| **+ Add Transaction** | Opens a sidebar form — supports single entry and paired payment/transfer modes, account dropdowns populated live from the API |
