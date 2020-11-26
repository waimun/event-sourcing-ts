import express from 'express'
import { shipRouter } from './ships'

const v1Router = express.Router()

v1Router.get('/', (req, res) => res.json({ message: '/api/v1' }))
v1Router.use('/ships', shipRouter)

export { v1Router }
