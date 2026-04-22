import User from "@/models/User";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { comparePassword } from "@/modules/bcrypt.module";
import { Role } from "@/types/model.types";
import { NextFunction, Request, Response } from "express";
import validator from "validator"
import { randomBytes } from "crypto";
import path from "path";
import { readFile } from "fs/promises";
import config from "@/config/config";
import { renderEjsHTMLStr, SMTPMailer } from "@/modules/mailer.module";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            username?: string
            email?: string
            password?: string
        } = {}

        const { username, email, password, password_confirmation } = req.body

        !username
            ? errors.username = "Username Is Required"
            : !validator.isLength(username, { min: 3, max: 10 })
                ? errors.username = "username length must be between 3 to 10"
                : null

        !email
            ? errors.email = "Email Is Required"
            : !validator.isEmail(email)
                ? errors.email = "Please Enter a Valid Email"
                : null

        !password
            ? errors.password = "Password Is Required"
            : !validator.isLength(password, { min: 6, max: 100 })
                ? errors.password = "password length must be between 6 to 100 character"
                : !validator.equals(password, password_confirmation)
                    ? errors.password = "password and confirm password mis-match"
                    : null

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST)
        }


        const dbUser = await User.findOne({
            $or: [{ email: email }, { username: username }]
        })


        if (dbUser) {
            dbUser!.username === username
                ? errors.username = "Username Already Exists"
                : null
            dbUser!.email === email
                ? errors.email = 'Email Already Exists'
                : null
            if (Object.keys(errors).length > 0) {
                throw new ApiError(errors, StatusCodes.CONFLICT);
            }
        }

        const newUser = await new User({
            username: username,
            email: email,
            password: password,
            role: Role.user,
        }).save();


        const token = await newUser.createAccessToken();

        return res.status(StatusCodes.CREATED).json({ access_token: token, user: newUser.newUserResponse() })

    } catch (error) {
        next(error)
    }
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            username?: string
            password?: string
        } = {}

        const { username, password } = req.body

        !username
            ? errors.username = "Username Is Required"
            : null
        !password
            ? errors.password = "Password Is Required"
            : null

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST)
        }


        const queryParams: {
            username?: string,
            email?: string
        } = { username: username }

        if (validator.isEmail(username)) {
            queryParams.email = username;
            delete queryParams['username']
        }

        const loginUser = await User.findOne(queryParams).select("+password");

        if (!loginUser)
            throw new ApiError("Invalid Credientials", StatusCodes.BAD_REQUEST);

        const isPassMatch = await comparePassword(password, loginUser.password);
        if (!isPassMatch)
            throw new ApiError("Invalid Credientials", StatusCodes.BAD_REQUEST);

        const token = await loginUser.createAccessToken();
        return res.status(StatusCodes.CREATED).json({ access_token: token, user: loginUser.publicResponse() })

    } catch (error) {
        next(error)
    }
}
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const errors: {
            email?: string
        } = {}

        const { email } = req.body

        !email
            ? errors.email = "Email Is Required"
            : !validator.isEmail(email)
                ? errors.email = "Please Enter a Valid Email"
                : null

        if (Object.keys(errors).length > 0) {
            throw new ApiError(errors, StatusCodes.BAD_REQUEST)
        }




        const dbUser = await User.findOne({ email });

        if (!dbUser)
            return res.status(StatusCodes.OK).json({ message: "If an account exists with this email, a password reset link will be sent" });

        const resetToken = randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000)


        dbUser.password_reset_token = resetToken;
        dbUser.password_reset_token_expires = resetTokenExpiry;

        await dbUser.save();


        const templatePath = path.resolve(__dirname, '../../extras/templates/email/auth/forgotPasswordMail.ejs');
        const templateContent = await readFile(templatePath, "utf-8");
        const resetLink = `${config.frontend_uri}/reset-password?email=${dbUser.email}&token=${resetToken}`

        const mailData = await renderEjsHTMLStr(templateContent, {
            email: dbUser.email,
            username: dbUser.username,
            resetLink: resetLink,
            expiresIn: "1 hour"
        })


        await SMTPMailer.sendMail({
            from: config.mail.mail_from,
            to: dbUser.email,
            subject: "Password Reset Mail",
            html: mailData
        });
        return res.status(StatusCodes.OK).json({
            message: "Password reset link sent to your email"
        });

    } catch (error) {
        next(error)
    }
}