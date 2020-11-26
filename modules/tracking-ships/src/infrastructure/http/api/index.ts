import express from 'express'
import { v1Router } from './routes/v1'

const app = express()
app.use(express.json())
const port = 3000

app.use('/api/v1', v1Router)

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
