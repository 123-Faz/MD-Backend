import ApiError, { StatusCodes } from '@/modules/apiError.module';
import { Request, Response, NextFunction } from 'express'


const routeNotFoundMiddleware = (req: Request, res: Response, next: NextFunction) => {
    next(new ApiError("Route Not Found", StatusCodes.NOT_FOUND));
}

export default routeNotFoundMiddleware;
