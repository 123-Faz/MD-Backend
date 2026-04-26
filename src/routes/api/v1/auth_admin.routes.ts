import { forgotPassword, login, resetPassword, changePassword } from '@/controller/v1/admin/auth_admin.controller'
import { authAdminMiddleware } from '@/middlewares/authMiddleware';
import { all } from '@/middlewares/trimRequestMiddleware'
import express from 'express'

const authAdminRouter = express.Router()

authAdminRouter.post('/login', all, login);
authAdminRouter.post('/forgot-password', all, forgotPassword);
authAdminRouter.post('/reset-password', all, resetPassword);
authAdminRouter.post('/change-password', all, authAdminMiddleware, changePassword);
export default authAdminRouter