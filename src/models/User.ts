import config from "@/config/config";
import { hashPassword } from "@/modules/bcrypt.module";
import { generateToken } from "@/services/token.service";
import { IUser, Role } from "@/types/model.types";
import { model, Schema } from "mongoose";
import validator from "validator"


const userSchema: Schema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            validate: [(value: string) => validator.isEmail(value), "Please Enter a valid Email"]
        },
        name: {
            type: String,
            required: false,
            default: ""
        },
        image: {
            type: String,
            required: false,
            default: ""
        },
        password: {
            type: String,
            required: true,
            select: false,
            default: ""
        },
        password_reset_token: {
            type: String,
            required: false,
            select: false,
            default: ""
        },
        password_reset_token_expires: {
            type: Date,
            required: false,
        },
        role: {
            type: String,
            required: true,
            default: Role.user,
            enum: Object.values(Role)
        },
        status: {
            type: Boolean,
            required: true,
            default: true,
        },
        suspanding_reasons: {
            type: [],
            required: false,
        },
        suspanding_count: {
            type: Number,
            required: false,
            default: 0,
        },
    },
    {
        collection: "users",
        timestamps: true
    }
)



userSchema.pre<IUser>('save', async function (this: IUser, next) {
    try {
        if (!this.isModified('password')) return next();
        this.password = await hashPassword(this.password);
        next();
    } catch (error: any) {
        next(error);
    }
})


userSchema.methods.createAccessToken = async function (this: IUser) {
    return await generateToken({ userId: this._id }, config.tokens.jwt_secret, '365d')
}
userSchema.methods.publicResponse = function (this: IUser) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
};
userSchema.methods.newUserResponse = function (this: IUser) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
}


export default model<IUser>('User', userSchema)