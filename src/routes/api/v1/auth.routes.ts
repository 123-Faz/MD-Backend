import { changePassword, forgotPassword, login, register, resetPassword,  } from '@/controller/v1/auth.controller'
import { authMiddleware } from '@/middlewares/authMiddleware';
import { all } from '@/middlewares/trimRequestMiddleware'
import express from 'express'

const authRouter = express.Router()

authRouter.post('/register', all, register);
authRouter.post('/login', all, login);
authRouter.post('/forgot-password', all, forgotPassword);
authRouter.post('/reset-password', all, resetPassword);
authRouter.post('/change-password', all, authMiddleware, changePassword);

export default authRouter