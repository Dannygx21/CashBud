const db = require('../DB/queries')

const express = require('express')
app = express()

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Server is working and responding')
}) 

// Create a user, including first and last name, needs, wants and savings percentage, budget period, and bank
app.post('/user', db.createUser)

app.listen(3000, () => {
  console.log(`API server listening on port 3000`)
})
