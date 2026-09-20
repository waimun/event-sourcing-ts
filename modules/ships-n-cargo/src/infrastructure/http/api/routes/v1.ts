import express from 'express'
import { ping } from '../ping'
import { shipRouter } from './ships'

const v1Router = express.Router()

v1Router.get('/', ping)
v1Router.use('/ships', shipRouter)

export { v1Router }
