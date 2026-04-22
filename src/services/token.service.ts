import { sign, verify } from "@/modules/jwt.module"
import jwt from "jsonwebtoken"


export const generateToken = async (
    payload: string | Buffer | object,
    secret: jwt.Secret,
    expiresIn: jwt.SignOptions['expiresIn']
): Promise<string> => {
    return await sign(payload, secret, expiresIn);
}


export const verifyToken = async (token: string, secret: jwt.Secret | jwt.GetPublicKeyOrSecret) => {
    return await verify(token, secret)
}