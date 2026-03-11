const path = require('path');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '../.env')
    : path.resolve(__dirname, '../.env.local'),
});
const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('../db/connect.cjs');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/accounts', require('./routes/accounts.cjs'));
app.use('/api/transactions', require('./routes/transactions.cjs'));
app.use('/api/expenses', require('./routes/expenses.cjs'));
app.use('/api/dashboard', require('./routes/dashboard.cjs'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

const server = async () => {
    try {
        await connectToMongo("Server Successfully Connected to Mongo", "Server Mongo connection FAILED");
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => console.log(`Budget Buddy API running on port ${PORT}`));
    } catch (err) {
        throw new Error(`Error in server start: ${err}`)
    }
}


server()

