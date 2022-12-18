import express from 'express'
import { shipRouter } from './ships'
import { ping } from '../ping'

const v1Router = express.Router()

v1Router.get('/', ping)
v1Router.use('/ships', shipRouter)

export { v1Router }
