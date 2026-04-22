import express from 'express'
import authRouter from './auth.routes'

import userRouter from './user.routes'
import adminRouter from './admin.routes'
import authAdminRouter from './auth_admin.routes'
import authDoctorRouter from './auth_doctor.routes'

const v1Router = express.Router()

v1Router.use('/auth', authRouter)
v1Router.use('/auth_admin', authAdminRouter)
v1Router.use('/auth_doctor', authDoctorRouter)
v1Router.use('/user', userRouter)
v1Router.use('/admin', adminRouter)


export default v1Router