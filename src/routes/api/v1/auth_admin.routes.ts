import { forgotPassword, login } from '@/controller/v1/admin/auth_admin.controller'
import { all } from '@/middlewares/trimRequestMiddleware'
import express from 'express'

const authAdminRouter = express.Router()

authAdminRouter.post('/login', all, login);
authAdminRouter.post('/forgot-password', all, forgotPassword);
export default authAdminRouter