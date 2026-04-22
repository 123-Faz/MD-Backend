import { model, Schema, Document, Types } from "mongoose";

export enum PrescriptionStatus {
  ACTIVE = "active",
  COMPLETED = "completed", 
  CANCELLED = "cancelled",
  EXPIRED = "expired"
}

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescriptionFile {
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_at: Date;
}

export interface IPrescription {
  _id?: Types.ObjectId;
  appointment_id: Types.ObjectId; // Rename from patient_id to appointment_id
  patient_id: Types.ObjectId;     // Add actual patient reference
  doctor_id: Types.ObjectId;
  medications: IMedication[];
  files: IPrescriptionFile[];
  issue_date: Date;
  expiry_date: Date;
  status: PrescriptionStatus;
  created_at?: Date;
  updated_at?: Date;
}

interface IPrescriptionDocument extends Omit<IPrescription, '_id'>, Document {
  publicResponse(): Omit<IPrescription, '__v'>;
}

const medicationSchema: Schema = new Schema<IMedication>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  dosage: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  frequency: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  duration: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  instructions: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500,
    default: ""
  }
});

const prescriptionFileSchema: Schema = new Schema<IPrescriptionFile>({
  filename: {
    type: String,
    required: true
  },
  original_name: {
    type: String,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});


// Update the schema
const prescriptionSchema: Schema = new Schema<IPrescriptionDocument>(
  {
    appointment_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Appointment',
      index: true
    },
    patient_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    doctor_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true
    },
    // ... rest of your schema remains the same
    medications: {
      type: [medicationSchema],
      required: true,
      validate: {
        validator: function(meds: IMedication[]) {
          return meds && meds.length > 0;
        },
        message: "At least one medication is required"
      }
    },
    files: {
      type: [prescriptionFileSchema],
      required: false,
      default: []
    },
    issue_date: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiry_date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      default: PrescriptionStatus.ACTIVE,
      enum: Object.values(PrescriptionStatus),
      index: true
    }
  },
  {
    collection: "prescriptions",
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Update indexes
prescriptionSchema.index({ patient_id: 1, status: 1 });
prescriptionSchema.index({ appointment_id: 1, status: 1 });
prescriptionSchema.index({ doctor_id: 1, status: 1 });
prescriptionSchema.index({ expiry_date: 1 });
// Auto-update status based on expiry date
prescriptionSchema.pre<IPrescriptionDocument>('save', function (next) {
  if (this.expiry_date && this.expiry_date < new Date() && this.status === PrescriptionStatus.ACTIVE) {
    this.status = PrescriptionStatus.EXPIRED;
  }
  next();
});

prescriptionSchema.methods.publicResponse = function (): Omit<IPrescription, '__v'> {
  const prescription = this as IPrescriptionDocument;
  const res = prescription.toObject() as any;
  delete res.__v;
  return res;
};

export default model<IPrescriptionDocument>('Prescription', prescriptionSchema);