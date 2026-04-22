import { forgotPassword, login, register } from '@/controller/v1/auth.controller'
import { all } from '@/middlewares/trimRequestMiddleware'
import express from 'express'

const authRouter = express.Router()

authRouter.post('/register', all, register);
authRouter.post('/login', all, login);
authRouter.post('/forgot-password', all, forgotPassword);
export default authRouter