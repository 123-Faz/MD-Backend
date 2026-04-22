import { Document, model, ObjectId, Schema } from "mongoose";

export enum AppointmentType {
    consultation = "consultation",
    followup = "follow-up", 
    checkup = "checkup",
    emergency = "emergency"
}

export enum AppointmentStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected",
    cancelled = "cancelled"
}

interface IAppointment extends Document {
    _id: ObjectId;
    user: ObjectId;
    doctor: ObjectId;
    patientName: string;
    appointmentDate: Date;
    appointmentTime: string;
    appointmentType: AppointmentType;
    symptoms: string;
    notes: string;
    status: AppointmentStatus;
    createAccessToken: () => Promise<string>;
    publicResponse: () => any;
    newUserResponse: () => any;
    appointmentResponse: () => any; // Add this line
}
const appointmentSchema: Schema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
            index: true // Added index for better performance
        },
        doctor: {
            type: Schema.Types.ObjectId,
            ref: "Doctor",
            required: [true, "Doctor selection is required"]
        },
        patientName: {
            type: String,
            required: [true, "Patient name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"]
        },
            appointmentDate: {
                type: Date,
            },
            appointmentTime: {
                type: String,
                match: /^([0-1]\d|2[0-3]):([0-5]\d)$/
            },
            
            appointmentType: {
            type: String,
            required: [true, "Appointment type is required"],
            enum: {
                values: Object.values(AppointmentType),
                message: 'Appointment type must be one of: consultation, follow-up, checkup, emergency'
            }
        },
        symptoms: {
            type: String,
            required: [true, "Symptoms description is required"],
            maxlength: [500, "Symptoms description cannot exceed 500 characters"]
        },
        notes: {
            type: String,
            maxlength: [200, "Notes cannot exceed 200 characters"],
            default: ""
        },
        status: {
            type: String,
            enum: {
                values: Object.values(AppointmentStatus),
                message: 'Status must be one of: pending, approved, rejected, cancelled'
            },
            default: AppointmentStatus.pending
        }
    },
    {
        collection: "appointments",
        timestamps: true
    }
);

// Static method to check if user can access appointment
appointmentSchema.statics.isUserAuthorized = async function(appointmentId: ObjectId, userId: ObjectId): Promise<boolean> {
    const appointment = await this.findOne({ _id: appointmentId, user: userId });
    return !!appointment;
};

appointmentSchema.methods.appointmentResponse = function () {
    const res = this.toObject();
    delete res['__v'];
    return res;
};

export default model<IAppointment>('Appointment', appointmentSchema);