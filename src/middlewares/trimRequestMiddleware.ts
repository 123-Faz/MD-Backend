import { Request, Response, NextFunction } from 'express';


const trimStringProperties = (obj: any) => {
    if (obj !== null && typeof obj === 'object') {
        for (const prop in obj) {
            if (typeof obj[prop] === 'object') {
                return trimStringProperties(obj[prop])
            }
            if (typeof obj[prop] === 'string') {
                obj[prop] = obj[prop].trim();
            }

        }

    }
}

export const all = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        trimStringProperties(req.body);
    }
    if (req.params) {
        trimStringProperties(req.params);
    }
    if (req.query) {
        trimStringProperties(req.query);
    }
    next();
}

export const body = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        trimStringProperties(req.body);
    }
    next();
}
export const param = (req: Request, res: Response, next: NextFunction) => {
    if (req.params) {
        trimStringProperties(req.params);
    }
    next();
}
export const query = (req: Request, res: Response, next: NextFunction) => {
    if (req.query) {
        trimStringProperties(req.query);
    }
    next();
}