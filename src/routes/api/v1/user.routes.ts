import { currentUser } from '@/controller/v1/user.controller';
import { getAllDoctors, requestAppointment,getUserAppointments, getPatientPrescriptions } from '@/controller/v1/user_appt.controller';
import { authMiddleware } from '@/middlewares/authMiddleware';
import express from 'express'

const userRouter = express.Router()

userRouter.get("/me", authMiddleware, currentUser);
userRouter.get("/get-all-drs", authMiddleware, getAllDoctors);
userRouter.post("/req-appt", authMiddleware, requestAppointment);
userRouter.get("/appt", authMiddleware, getUserAppointments); //psp?appointment_id=68e8cebb758b7e20608cbc04
userRouter.get("/psp", authMiddleware, getPatientPrescriptions);

export default userRouter