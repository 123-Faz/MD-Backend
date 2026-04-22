
import { Document, model, ObjectId, Schema } from "mongoose";

interface ISchedule extends Document {
    _id: ObjectId;
    doctor: ObjectId;
    
    // Date ranges instead of individual dates
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    
    isHoliday: boolean;
    isOnLeave: boolean;
    leaveStartDate?: Date;
    leaveEndDate?: Date;
    leaveReason?: string;
    
    confirmedAppointments: [{
        appointmentId: ObjectId;
        patientName: string;
        appointmentDate: Date;
        appointmentTime: string;
    }];
    
    createAccessToken: () => Promise<string>;
    publicResponse: () => any;
    newUserResponse: () => any;
}

const scheduleSchema: Schema = new Schema(
    {
        doctor: {
            type: Schema.Types.ObjectId,
            ref: "Doctor",
            required: true
        },
        
        // Date ranges
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        
        // Rest remains same...
        isHoliday: {
            type: Boolean,
            default: false
        },
        isOnLeave: {
            type: Boolean,
            default: false
        },
        leaveStartDate: Date,
        leaveEndDate: Date,
        leaveReason: String,
        
        confirmedAppointments: [{
            appointmentId: {
                type: Schema.Types.ObjectId,
                ref: "Appointment"
            },
            patientName: String,
            appointmentDate: Date,
            appointmentTime: String
        }]
    },
    {
        collection: "schedules",
        timestamps: true
    }
);
export default model<ISchedule>('Schedule', scheduleSchema);