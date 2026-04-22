import User from "@/models/User";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";

export const currentUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const user = await User.findOne({ _id: req.user?.userId })
    return res.status(StatusCodes.OK).json(user?.publicResponse())

  } catch (error) {
    next(error)
  }
}
