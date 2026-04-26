import Admin from "@/models/Admin";
import Doctor from "@/models/Doctor";
import Schedule from "@/models/Schedules";
import User from "@/models/User";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import fs from "fs";
import { UploadedFile } from "express-fileupload";
import path from "path";





export const currentUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new ApiError("Admin ID missing from token", StatusCodes.UNAUTHORIZED);
    }

    const user = await Admin.findById(adminId);
    if (!user) {
      throw new ApiError("Admin not found", StatusCodes.NOT_FOUND);
    }

    return res.status(StatusCodes.OK).json(user.publicResponse());

  } catch (error) {
    next(error)
  }
}

export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    // ❌ Prevent password update here
    if (req.body.password) {
      throw new ApiError("Password update is not allowed in this route", StatusCodes.BAD_REQUEST);
    }

    const {
      username,
      email,
      name,
    } = req.body;

    const errors: any = {};

    // ✅ Validation
    if (username && !validator.isLength(username, { min: 3, max: 10 })) {
      errors.username = "Username must be between 3-10 characters";
    }

    if (email && !validator.isEmail(email)) {
      errors.email = "Invalid email format";
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(errors, StatusCodes.BAD_REQUEST);
    }

    // ✅ Find admin
    const user = await Admin.findById(userId);

    if (!user) {
      throw new ApiError("Admin not found", StatusCodes.NOT_FOUND);
    }

    // ✅ Check duplicates (username/email)
    if (username && username !== user.username) {
      const existingUsername = await Admin.findOne({ username });
      if (existingUsername) {
        throw new ApiError("Username already exists", StatusCodes.CONFLICT);
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await Admin.findOne({ email });
      if (existingEmail) {
        throw new ApiError("Email already exists", StatusCodes.CONFLICT);
      }
      user.email = email;
    }

    // ✅ Update fields (only if provided)
    if (name !== undefined) user.name = name;

    // ✅ Handle Image Upload
    if (req.files && req.files.image) {
        const image = req.files.image as UploadedFile;

        // Validate file type
        if (!image.mimetype.startsWith('image')) {
            throw new ApiError("Please upload an image file", StatusCodes.BAD_REQUEST);
        }

        // Delete old image if it exists
        if (user.image && user.image.startsWith('/storage/uploads/admin/')) {
            // Go back 3 levels from src/controller/v1/admin/ to reach src/
            const oldImagePath = path.join(__dirname, '../../../', user.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Save new image in admin-specific folder
        const displayName = user.name ? user.name.replace(/\s+/g, '-') : user.username;
        const fileName = `admin-${displayName}-${userId}-${Date.now()}${path.extname(image.name)}`;
        const uploadDir = path.join(__dirname, '../../../storage/uploads/admin');
        const uploadPath = path.join(uploadDir, fileName);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        await image.mv(uploadPath);
        user.image = `/storage/uploads/admin/${fileName}`;
    }

    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Profile updated successfully",
      user: user.publicResponse(),
    });

  } catch (error) {
    next(error);
  }
};

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
                createdBy: new Types.ObjectId(req.user.userId) // Convert to ObjectId
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