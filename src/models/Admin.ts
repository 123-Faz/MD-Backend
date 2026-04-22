import config from "@/config/config";
import { hashPassword } from "@/modules/bcrypt.module";
import { generateToken } from "@/services/token.service";
import { IAdmin, AdminRole } from "@/types/model.types";
import { model, Schema } from "mongoose";
import validator from "validator"


const adminSchema: Schema = new Schema<IAdmin>(
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
            default: AdminRole.admin,
            enum: Object.values(AdminRole)
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
        collection: "admins",
        timestamps: true
    }
)



adminSchema.pre<IAdmin>('save', async function (this: IAdmin, next) {
    try {
        if (!this.isModified('password')) return next();
        this.password = await hashPassword(this.password);
        next();
    } catch (error: any) {
        next(error);
    }
})


adminSchema.methods.createAccessToken = async function (this: IAdmin) {
    return await generateToken({ userId: this._id }, config.tokens.admin_jwt_secret, '365d')
}
adminSchema.methods.publicResponse = function (this: IAdmin) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
};
adminSchema.methods.newUserResponse = function (this: IAdmin) {
    const res = this.toObject();
    delete res['password'];
    delete res['suspanding_reasons'];
    delete res['suspanding_count'];
    delete res['password_reset_token'];
    delete res['__v'];
    return res;
}


export default model<IAdmin>('Admin', adminSchema)