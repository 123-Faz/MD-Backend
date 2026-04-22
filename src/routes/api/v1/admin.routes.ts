import { 
  assignSchedule, 
  currentUser, 
  getAllDoctors, 
  getAllUsers,
  updateUser,
  deleteUser 
} from '@/controller/v1/admin/admin.controller';
import { authAdminMiddleware } from '@/middlewares/authMiddleware';
import express from 'express'

const adminRouter = express.Router()

adminRouter.get("/me", authAdminMiddleware, currentUser);
adminRouter.get("/get-all-drs", authAdminMiddleware, getAllDoctors);
adminRouter.post('/schedules', authAdminMiddleware, assignSchedule);
adminRouter.get('/users', authAdminMiddleware, getAllUsers);
adminRouter.put('/users/:userId', authAdminMiddleware, updateUser);
adminRouter.delete('/users/:userId', authAdminMiddleware, deleteUser);

export default adminRouter