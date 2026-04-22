import config from "@/config/config";
import ApiError, { ReasonPhrases, StatusCodes } from "@/modules/apiError.module";
import { verifyToken } from "@/services/token.service";
import { NextFunction, Request, Response } from "express";


declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}


export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization)
    return next(new ApiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED))

  const bearerToken = req.headers.authorization;
  const tokenSplit = bearerToken.split(' ');
  const tokenKey = tokenSplit[0];
  const tokenValue = tokenSplit[1];
  if (tokenKey.toLowerCase() !== 'bearer' || !tokenValue)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))
  const payload = await verifyToken(tokenValue, config.tokens.jwt_secret)
  if (!payload)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))

  req.user = payload
  next();
}
export const authAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization)
    return next(new ApiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED))

  const bearerToken = req.headers.authorization;
  const tokenSplit = bearerToken.split(' ');
  const tokenKey = tokenSplit[0];
  const tokenValue = tokenSplit[1];
  if (tokenKey.toLowerCase() !== 'bearer' || !tokenValue)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))
  const payload = await verifyToken(tokenValue, config.tokens.admin_jwt_secret)
  if (!payload)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))

  req.user = payload
  next();
}

export const authDoctorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization)
    return next(new ApiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED))

  const bearerToken = req.headers.authorization;
  const tokenSplit = bearerToken.split(' ');
  const tokenKey = tokenSplit[0];
  const tokenValue = tokenSplit[1];
  if (tokenKey.toLowerCase() !== 'bearer' || !tokenValue)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))
  const payload = await verifyToken(tokenValue, config.tokens.doctor_jwt_secret)
  if (!payload)
    return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED))

  req.user = payload
  next();
}

// export const authDoctorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
//     if (!req.headers.authorization)
//         return next(new ApiError(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED));

//     const bearerToken = req.headers.authorization;
//     const tokenSplit = bearerToken.split(' ');
//     const tokenKey = tokenSplit[0];
//     const tokenValue = tokenSplit[1];
    
//     if (tokenKey.toLowerCase() !== 'bearer' || !tokenValue)
//         return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED));
    
//     const payload = await verifyToken(tokenValue, config.tokens.doctor_jwt_secret);
//     if (!payload)
//         return next(new ApiError("Invalid Token", StatusCodes.UNAUTHORIZED));

//     req.user = payload;
//     next();
// };