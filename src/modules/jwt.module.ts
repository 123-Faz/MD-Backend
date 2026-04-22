import jwt from "jsonwebtoken";
import logger from "./logger.module";


export const sign = async (
    payload: string | Buffer | object,
    secret: jwt.Secret,
    expiresIn: jwt.SignOptions['expiresIn']
): Promise<string> => {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, secret, { expiresIn: expiresIn }, (error, token) => {
            if (error) {
                logger.error(error)
                reject(error)
            }
            else {
                resolve(token as string)
            }
        })
    })
}
export const verify = async (token: string, secret: jwt.Secret | jwt.GetPublicKeyOrSecret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (error, payload) => {
            if (error) {
                resolve(null);
            }
            else {
                resolve(payload)
            }
        })
    })
}
