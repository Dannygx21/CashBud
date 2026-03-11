require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectToMongo } = require('../db/connect.cjs');

const app = express();

connectToMongo("Server Successfully Connected to Mongo", "Server Mongo connection FAILED");

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Budget Buddy API running on port ${PORT}`));
