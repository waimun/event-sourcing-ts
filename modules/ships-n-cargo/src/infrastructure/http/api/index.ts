/* istanbul ignore file */
import express from 'express'
import { ping } from './ping'
import { v1Router } from './routes/v1'

const app = express()
app.use(express.json())
const port = 3000

app.get('/', ping)
app.use('/api/v1', v1Router)

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
