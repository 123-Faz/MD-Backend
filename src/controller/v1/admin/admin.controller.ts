import Admin from "@/models/Admin";
import Doctor from "@/models/Doctor";
import Schedule from "@/models/Schedules";
import User from "@/models/User";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import validator from "validator"
import bcrypt from "bcryptjs";





export const currentUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await Admin.findOne({ _id: req.user?.userId })
    return res.status(StatusCodes.OK).json(user?.publicResponse())

  } catch (error) {
    next(error)
  }
}

export const getAllDoctors = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const doctors = await Doctor.find({}).select('username specialization experience')
        return res.status(StatusCodes.OK).json(doctors)
    }
    catch (error) {
        next(error)
    }
}

export const assignSchedule = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            doctorId?: string;
            startDate?: string;
            endDate?: string;
            startTime?: string;
            endTime?: string;
        } = {};

        const { doctorId, startDate, endDate, startTime, endTime } = req.body;

        // Validation
        !doctorId ? errors.doctorId = "Doctor selection is required" : null;
        !startDate ? errors.startDate = "Start date is required" : null;
        !endDate ? errors.endDate = "End date is required" : null;
        !startTime ? errors.startTime = "Start time is required" : null;
        !endTime ? errors.endTime = "End time is required" : null;

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST);
        }

        // Validate and convert to ObjectId
        if (!Types.ObjectId.isValid(doctorId)) {
            throw new ApiError("Invalid doctor ID format", StatusCodes.BAD_REQUEST);
        }

        const doctorObjectId = new Types.ObjectId(doctorId);

        // Check if doctor exists using ObjectId
        const doctor = await Doctor.findById(doctorObjectId);
        if (!doctor) {
            throw new ApiError("Doctor not found", StatusCodes.NOT_FOUND);
        }

        // ✅ CHECK: If schedule already exists for this doctor using ObjectId
        const existingSchedule = await Schedule.findOne({ doctor: doctorObjectId });
        
        let schedule;
        
        if (existingSchedule) {
            // ✅ UPDATE existing schedule
            existingSchedule.startDate = new Date(startDate);
            existingSchedule.endDate = new Date(endDate);
            existingSchedule.startTime = startTime;
            existingSchedule.endTime = endTime;
            existingSchedule.isHoliday = false;
            existingSchedule.isOnLeave = false;
            
            schedule = await existingSchedule.save();
        } else {
            // ✅ CREATE new schedule if doesn't exist
            schedule = new Schedule({
                doctor: doctorObjectId, // Use ObjectId
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                startTime: startTime,
                endTime: endTime,
                isHoliday: false,
                isOnLeave: false,
                createdBy: new Types.ObjectId(req.user._id) // Convert to ObjectId
            });
            
            await schedule.save();
        }

        // Manual response
        const response = {
            _id: schedule._id,
            doctor: schedule.doctor,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isHoliday: schedule.isHoliday,
            isOnLeave: schedule.isOnLeave,
            action: existingSchedule ? "updated" : "created"
        };

        return res.status(StatusCodes.CREATED).json({
            message: `Schedule ${existingSchedule ? 'updated' : 'assigned'} successfully`,
            schedule: response
        });

    } catch (error) {
        next(error);
    }
};



export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const users = await User.find({})
        return res.status(StatusCodes.OK).json(users)
    }
    catch (error) {
        next(error)
    }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            userId?: string
            username?: string
            email?: string
            password?: string
        } = {}

        const { userId } = req.params
        const { username, email, password } = req.body

        !userId
            ? errors.userId = "User ID Is Required"
            : !Types.ObjectId.isValid(userId)
                ? errors.userId = "Invalid User ID"
                : null

        if (username) {
            !validator.isLength(username, { min: 3, max: 10 })
                ? errors.username = "Username length must be between 3 to 10"
                : null
        }

        if (email) {
            !validator.isEmail(email)
                ? errors.email = "Please Enter a Valid Email"
                : null
        }

        if (password) {
            !validator.isLength(password, { min: 6, max: 100 })
                ? errors.password = "Password length must be between 6 to 100 character"
                : null
        }

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST)
        }

        const userObjectId = new Types.ObjectId(userId)

        // Check if user exists
        const existingUser = await User.findById(userObjectId)
        if (!existingUser) {
            throw new ApiError("User not found", StatusCodes.NOT_FOUND)
        }

        // Check for duplicate username or email
        if (username || email) {
            const duplicateQuery: any = { _id: { $ne: userObjectId } }
            
            if (username) duplicateQuery.username = username
            if (email) duplicateQuery.email = email

            const duplicateUser = await User.findOne(duplicateQuery)

            if (duplicateUser) {
                duplicateUser.username === username
                    ? errors.username = "Username Already Exists"
                    : null
                duplicateUser.email === email
                    ? errors.email = "Email Already Exists"
                    : null
                
                if (Object.keys(errors).length > 0) {
                    throw new ApiError(errors, StatusCodes.CONFLICT)
                }
            }
        }

        // Prepare update data
        const updateData: any = {}
        if (username) updateData.username = username
        if (email) updateData.email = email
        if (password) updateData.password = password 
        

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userObjectId,
            updateData,
            { new: true }
        )

        return res.status(StatusCodes.OK).json(updatedUser)

    } catch (error) {
        next(error)
    }
}

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            userId?: string
        } = {}

        const { userId } = req.params

        !userId
            ? errors.userId = "User ID Is Required"
            : !Types.ObjectId.isValid(userId)
                ? errors.userId = "Invalid User ID"
                : null

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST)
        }

        const userObjectId = new Types.ObjectId(userId)

        // Check if user exists
        const existingUser = await User.findById(userObjectId)
        if (!existingUser) {
            throw new ApiError("User not found", StatusCodes.NOT_FOUND)
        }

        // Delete user
        const deletedUser = await User.findByIdAndDelete(userObjectId)

        return res.status(StatusCodes.OK).json(deletedUser)

    } catch (error) {
        next(error)
    }
}