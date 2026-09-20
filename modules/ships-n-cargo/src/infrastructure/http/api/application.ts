import express, { type Application } from 'express'
import { ping } from './ping'
import { v1Router } from './routes/v1'

const createApplication = (): Application => {
  const application = express()

  application.use(express.json())
  application.get('/', ping)
  application.use('/api/v1', v1Router)

  return application
}

export { createApplication }
