import { StatusCodes } from '@/modules/apiError.module';
import { isValidJson } from '@/modules/helper.module';
import { Request, Response, NextFunction } from 'express';


const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;

    let message

    try {
        if (typeof err !== 'object') {
            message = JSON.parse(err)
        }
        else if (typeof err.message === "string" && isValidJson(err.message)) {
            message = JSON.parse(err.message)
        }
        else {
            message = err.message || 'Internal Server Error';
            console.log(`[Actual Error]: ${err}`);
        }
    }
    catch (error: any) {
        message = "Error parsing message"
        console.log(`[Parse Error]: ${error.message}`);
        console.log(`[Actual Error]: ${error}`);

    }

    res.status(statusCode).json({
        error: message,
        status: statusCode
    })
}



export default defaultErrorHandler;
