import config from "@/config/config";
import { hashPassword } from "@/modules/bcrypt.module";
import { generateToken } from "@/services/token.service";
import { model, Schema } from "mongoose";
import validator from "validator"
import { IDoctor } from "@/types/model.types";


const userSchema: Schema = new Schema<IDoctor>(
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
        specialization: {
            type: String,
            required: true,
            unique: true,
        },
        experience: {
            type: String,
            required: true,
            unique: true,
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
            default: "doctor",
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
        collection: "doctors",
        timestamps: true
    }
)



userSchema.pre<IDoctor>('save', async function (this: IDoctor, next) {
    try {
        if (!this.isModified('password')) return next();
        this.password = await hashPassword(this.password);
        next();
    } catch (error: any) {
        next(error);
    }
})


userSchema.methods.createAccessToken = async function (this: IDoctor) {
    return await generateToken({ userId: this._id }, config.tokens.doctor_jwt_secret, '365d')
}
userSchema.methods.publicResponse = function (this: IDoctor) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
};
userSchema.methods.newUserResponse = function (this: IDoctor) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
}


export default model<IDoctor>('Doctor', userSchema)
