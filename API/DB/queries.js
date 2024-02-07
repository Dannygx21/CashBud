const Pool = require('pg').Pool
const pool = new Pool({
  user: 'me',
  host: 'localhost',
  database: 'cashbud_api',
  password: 'password',
  port: 5432
})


// create user
const createUser = (req, res) => {
  const arr = [];
  Object.entries(req.body).forEach((key, value) => {
    arr.push(value)
  })
  const query = `INSERT INTO users (first_name, last_name, needs_perc, wants_perc, savings_perc, budget_period, bank)`
  pool.query(query, arr, (err, results) => {
    if (error) {
      console.log('error in createUser query', error)
      throw error
    }

    res.status(201).send(results)
  })
}

module.exports = {
  createUser
}
