import { StatusCodes } from '@/modules/apiError.module'
import express, { Request, Response, NextFunction } from 'express'

const mainRouter = express.Router()


mainRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        return res.status(StatusCodes.OK).json({ message: "Welcome to API Server" })
    }
    catch (error) {
        next(error)
    }
})

export default mainRouter
