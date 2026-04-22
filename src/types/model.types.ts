import { Document, ObjectId } from "mongoose"

export enum Role {
    user = "user",
}
export enum AdminRole {
    admin = "admin",
    super = "super",
}

export interface IUser extends Document {
    _id: ObjectId;
    username: string;
    email: string;
    name?: string;
    image?: string;
    password: string;
    password_reset_token?: string;
    password_reset_token_expires?: Date;
    role: Role;
    status: boolean;
    suspanding_reasons?: string[];
    suspanding_count?: number;
    createAccessToken: () => Promise<string>;
    publicResponse: () => Promise<any>;
    newUserResponse: () => Promise<any>;
}

export interface IDoctor extends Document {
    _id: ObjectId;
    username: string;
    email: string;
    specialization: string;
    experience: string;
    name?: string;
    image?: string;
    password: string;
    password_reset_token?: string;
    password_reset_token_expires?: Date;
    role: string;
    status: boolean;
    suspanding_reasons?: string[];
    suspanding_count?: number;
    createAccessToken: () => Promise<string>;
    publicResponse: () => Promise<any>;
    newUserResponse: () => Promise<any>;
}


export interface IAdmin extends Document {
    _id: ObjectId;
    username: string;
    email: string;
    name?: string;
    image?: string;
    password: string;
    password_reset_token?: string;
    password_reset_token_expires?: Date;
    role: AdminRole;
    status: boolean;
    suspanding_reasons?: string[];
    suspanding_count?: number;
    createAccessToken: () => Promise<string>;
    publicResponse: () => Promise<any>;
    newUserResponse: () => Promise<any>;
}