import { login } from '@/controller/v1/doctor/auth.controller';
import { register} from '@/controller/v1/doctor/auth.controller'
import { currentUser, getDoctorSchedules, getPendingAppointments, confirmAppointment, createPrescription, getDoctorPrescriptions } from '@/controller/v1/doctor/user.controller';
import { all } from '@/middlewares/trimRequestMiddleware'
import express from 'express'
import {authDoctorMiddleware} from "@/middlewares/authMiddleware"


const authDoctorRouter = express.Router()

authDoctorRouter.get("/me", authDoctorMiddleware, currentUser);
authDoctorRouter.post('/register', all, register);
authDoctorRouter.post('/login', all, login);
authDoctorRouter.get('/all-scd', authDoctorMiddleware, getDoctorSchedules);
authDoctorRouter.get('/all-appointments', authDoctorMiddleware, getPendingAppointments);
authDoctorRouter.post('/confrim-appointments', authDoctorMiddleware, confirmAppointment);
authDoctorRouter.post('/psp', authDoctorMiddleware, createPrescription);
authDoctorRouter.get('/get-psp', authDoctorMiddleware, getDoctorPrescriptions);
// authDoctorRouter.patch('/update-psp', authDoctorMiddleware, updatePrescriptionStatus);


export default authDoctorRouter