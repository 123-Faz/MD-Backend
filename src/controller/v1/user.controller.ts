import User from "@/models/User";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { UploadedFile } from "express-fileupload";
import validator from "validator";
import path from "path";

export const currentUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await User.findOne({ _id: req.user?.userId })
    return res.status(StatusCodes.OK).json(user?.publicResponse())

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

    // ✅ Find user
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError("User not found", StatusCodes.NOT_FOUND);
    }

    // ✅ Check duplicates (username/email)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        throw new ApiError("Username already exists", StatusCodes.CONFLICT);
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
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
        if (user.image && user.image.startsWith('/storage/uploads/user/')) {
            // Go back 2 levels from src/controller/v1/ to reach src/
            const oldImagePath = path.join(__dirname, '../../', user.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Save new image in structured folder with descriptive name
        const displayName = user.name ? user.name.replace(/\s+/g, '-') : user.username;
        const fileName = `user-${displayName}-${userId}-${Date.now()}${path.extname(image.name)}`;
        const uploadDir = path.join(__dirname, '../../storage/uploads/user');
        const uploadPath = path.join(uploadDir, fileName);
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        await image.mv(uploadPath);
        user.image = `/storage/uploads/user/${fileName}`;
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