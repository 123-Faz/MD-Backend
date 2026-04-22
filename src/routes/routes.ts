import express from 'express'
import mainRouter from './main/main.routes'
import apiRouter from './api/api.routes'

const router = express.Router()

router.use('/', mainRouter)
router.use('/api', apiRouter)

export default router