import Doctor from "@/models/Doctor";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { comparePassword } from "@/modules/bcrypt.module";
import { NextFunction, Request, Response } from "express";
import validator from "validator";
import { randomBytes } from "crypto";
import path from "path";
import { readFile } from "fs/promises";
import config from "@/config/config";
import { renderEjsHTMLStr, GmailMailer } from "@/modules/mailer.module";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: any = {};
        const { username, email, password, password_confirmation, specialization, experience } = req.body;

        if (!username) errors.username = "Username is required";
        else if (!validator.isLength(username, { min: 3, max: 10 })) errors.username = "Username must be 3-10 characters";

        if (!email) errors.email = "Email is required";
        else if (!validator.isEmail(email)) errors.email = "Invalid email format";

        if (!specialization) errors.specialization = "Specialization is required";
        if (!experience) errors.experience = "Experience is required";

        if (!password) errors.password = "Password is required";
        else if (!validator.isLength(password, { min: 6, max: 100 })) errors.password = "Password must be 6-100 characters";
        else if (password !== password_confirmation) errors.password = "Passwords do not match";

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST);
        }

        const existingDoctor = await Doctor.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
        if (existingDoctor) {
            if (existingDoctor.email === email.toLowerCase()) errors.email = "Email already exists";
            if (existingDoctor.username === username) errors.username = "Username already exists";
            throw new ApiError(errors, StatusCodes.CONFLICT);
        }

        const newDoctor = await new Doctor({
            username,
            email,
            password,
            specialization,
            experience,
            role: "doctor"
        }).save();

        const token = await newDoctor.createAccessToken();

        // Send Welcome Email
        try {
            const templatePath = path.resolve(__dirname, '../../../extras/templates/email/auth/welcomeMail.ejs');
            const templateContent = await readFile(templatePath, "utf-8");
            const mailData = await renderEjsHTMLStr(templateContent, { username: newDoctor.username });

            await GmailMailer.sendMail({
                from: process.env.EMAIL_USER,
                to: newDoctor.email,
                subject: "Welcome to MediTrack (Doctor Portal)",
                html: mailData
            });
        } catch (emailError) {
            console.error(`[Error] Failed to send welcome email to doctor ${newDoctor.email}:`, emailError);
        }

        return res.status(StatusCodes.CREATED).json({ access_token: token, user: newDoctor.newUserResponse() });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            throw new ApiError("Username and password are required", StatusCodes.BAD_REQUEST);
        }

        const queryParams: any = { username: username };
        if (validator.isEmail(username)) {
            queryParams.email = username.toLowerCase();
            delete queryParams.username;
        }

        const doctor = await Doctor.findOne(queryParams).select("+password");
        if (!doctor) {
            throw new ApiError("Invalid credentials", StatusCodes.BAD_REQUEST);
        }

        const isMatch = await comparePassword(password, doctor.password);
        if (!isMatch) {
            throw new ApiError("Invalid credentials", StatusCodes.BAD_REQUEST);
        }

        const token = await doctor.createAccessToken();
        return res.status(StatusCodes.OK).json({ access_token: token, user: doctor.publicResponse() });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email } = req.body;

        if (!email || !validator.isEmail(email)) {
            throw new ApiError("Valid email is required", StatusCodes.BAD_REQUEST);
        }

        const doctor = await Doctor.findOne({ email: email.toLowerCase() });
        if (!doctor) {
            return res.status(StatusCodes.OK).json({ message: "If an account exists, a reset link will be sent" });
        }

        const resetToken = randomBytes(32).toString('hex');
        doctor.password_reset_token = resetToken;
        doctor.password_reset_token_expires = new Date(Date.now() + 3600000); // 1 hour

        await doctor.save();

        const resetLink = `${config.frontend_uri}/reset-password?email=${doctor.email}&token=${resetToken}&role=doctor`;
        
        try {
            const templatePath = path.resolve(__dirname, '../../../extras/templates/email/auth/forgotPasswordMail.ejs');
            const templateContent = await readFile(templatePath, "utf-8");
            const mailData = await renderEjsHTMLStr(templateContent, {
                email: doctor.email,
                username: doctor.username,
                resetLink,
                expiresIn: "1 hour"
            });

            await GmailMailer.sendMail({
                from: process.env.EMAIL_USER,
                to: doctor.email,
                subject: "Doctor Password Reset",
                html: mailData
            });
        } catch (emailError) {
            console.error(`[Error] Failed to send reset email to doctor ${doctor.email}:`, emailError);
        }

        return res.status(StatusCodes.OK).json({ message: "Password reset link sent to your email" });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email, token, password, password_confirmation } = req.body;

        if (!email || !token || !password) {
            throw new ApiError("Missing required fields", StatusCodes.BAD_REQUEST);
        }

        if (password !== password_confirmation) {
            throw new ApiError("Passwords do not match", StatusCodes.BAD_REQUEST);
        }

        const doctor = await Doctor.findOne({
            email: email.toLowerCase(),
            password_reset_token: token,
            password_reset_token_expires: { $gt: Date.now() }
        });

        if (!doctor) {
            throw new ApiError("Invalid or expired reset token", StatusCodes.BAD_REQUEST);
        }

        doctor.password = password;
        doctor.password_reset_token = undefined;
        doctor.password_reset_token_expires = undefined;

        await doctor.save();

        return res.status(StatusCodes.OK).json({ message: "Password reset successfully" });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const doctorId = req.user?.userId;

        if (!oldPassword || !newPassword || !confirmPassword) {
            throw new ApiError("All fields are required", StatusCodes.BAD_REQUEST);
        }

        if (newPassword !== confirmPassword) {
            throw new ApiError("Passwords do not match", StatusCodes.BAD_REQUEST);
        }

        const doctor = await Doctor.findById(doctorId).select("+password");
        if (!doctor) {
            throw new ApiError("Doctor not found", StatusCodes.NOT_FOUND);
        }

        const isMatch = await comparePassword(oldPassword, doctor.password);
        if (!isMatch) {
            throw new ApiError("Current password is incorrect", StatusCodes.BAD_REQUEST);
        }

        doctor.password = newPassword;
        await doctor.save();

        return res.status(StatusCodes.OK).json({ message: "Password changed successfully" });
    } catch (error) {
        next(error);
    }
};