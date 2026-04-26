import Appointment, { AppointmentStatus } from "@/models/Appointments";
import Schedule from "@/models/Schedules";
import Doctor from "@/models/Doctor";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";
import Prescription from "@/models/Prescriptions";
import { Types } from "mongoose";
import {
  IPrescription,
  IMedication,
  PrescriptionStatus,
} from "@/models/Prescriptions";
import { uploadFile } from "@/services/file.service";
import fs from "fs";
import { UploadedFile } from "express-fileupload";
import validator from "validator";
import path from "path";

export const currentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const user = await Doctor.findOne({ _id: req.user?.userId });
    return res.status(StatusCodes.OK).json(user?.publicResponse());
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    // Prevent password update here
    if (req.body.password) {
      throw new ApiError("Password update is not allowed in this route", StatusCodes.BAD_REQUEST);
    }

    const { username, email, name } = req.body;

    const errors: any = {};

    if (username && !validator.isLength(username, { min: 3, max: 10 })) {
      errors.username = "Username must be between 3-10 characters";
    }

    if (email && !validator.isEmail(email)) {
      errors.email = "Invalid email format";
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(errors, StatusCodes.BAD_REQUEST);
    }

    // Find doctor
    const doctor = await Doctor.findById(userId);

    if (!doctor) {
      throw new ApiError("Doctor not found", StatusCodes.NOT_FOUND);
    }

    // Check duplicates (username/email)
    if (username && username !== doctor.username) {
      const existingUsername = await Doctor.findOne({ username });
      if (existingUsername) {
        throw new ApiError("Username already exists", StatusCodes.CONFLICT);
      }
      doctor.username = username;
    }

    if (email && email !== doctor.email) {
      const existingEmail = await Doctor.findOne({ email });
      if (existingEmail) {
        throw new ApiError("Email already exists", StatusCodes.CONFLICT);
      }
      doctor.email = email;
    }

    // Update fields (only if provided)
    if (name !== undefined) doctor.name = name;

    // Handle Image Upload
    if (req.files && req.files.image) {
      const image = req.files.image as UploadedFile;

      if (!image.mimetype.startsWith('image')) {
        throw new ApiError("Please upload an image file", StatusCodes.BAD_REQUEST);
      }

      // Delete old image if it exists
      if (doctor.image && doctor.image.startsWith('/storage/uploads/doctor/')) {
        // Go back 3 levels from src/controller/v1/doctor/ to reach src/
        const oldImagePath = path.join(__dirname, '../../../', doctor.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      const displayName = doctor.name ? doctor.name.replace(/\s+/g, '-') : doctor.username;
      const fileName = `doctor-${displayName}-${userId}-${Date.now()}${path.extname(image.name)}`;
      const uploadDir = path.join(__dirname, '../../../storage/uploads/doctor');
      const uploadPath = path.join(uploadDir, fileName);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      await image.mv(uploadPath);
      doctor.image = `/storage/uploads/doctor/${fileName}`;
    }

    await doctor.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Profile updated successfully",
      user: doctor.publicResponse(),
    });

  } catch (error) {
    next(error);
  }
};

export const getDoctorSchedules = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Authentication check
    if (!req.user?.userId) {
      throw new ApiError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const doctorId = req.user.userId;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new ApiError("Invalid doctor ID format", StatusCodes.BAD_REQUEST);
    }

    const doctorObjectId = new Types.ObjectId(doctorId);

    // Get today's date for filtering
    const today = new Date();

    // Find schedules with broader criteria for debugging
    const schedules = await Schedule.find({
      doctor: doctorObjectId, // Use ObjectId
      // Remove date filter temporarily to see ALL schedules
      // endDate: { $gte: today }
    }).sort({ startDate: 1 });

    return res.status(StatusCodes.OK).json({
      message: "Schedules fetched successfully",
      count: schedules.length,
      schedules: schedules,
    });
  } catch (error) {
    next(error);
  }
};
export const getPendingAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (!req.user?.userId) {
      throw new ApiError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const doctorId = req.user.userId;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(doctorId)) {
      throw new ApiError("Invalid doctor ID", StatusCodes.BAD_REQUEST);
    }

    const doctorObjectId = new Types.ObjectId(doctorId);

    // Find appointments with ObjectId
    const appointments = await Appointment.find({
      doctor: doctorObjectId,
    }).sort({ createdAt: 1 });

    return res.status(StatusCodes.OK).json({
      message: "Appointments fetched successfully",
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmAppointment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const errors: {
      appointmentId?: string;
      appointmentDate?: string;
      appointmentTime?: string;
    } = {};

    const { appointmentId, appointmentDate, appointmentTime } = req.body;
    const doctorId = req.user.userId;

    // Validation
    if (!appointmentId) errors.appointmentId = "Appointment ID is required";
    if (!appointmentDate)
      errors.appointmentDate = "Appointment date is required";
    if (!appointmentTime)
      errors.appointmentTime = "Appointment time is required";

    if (Object.keys(errors).length > 0) {
      throw new ApiError(errors, StatusCodes.BAD_REQUEST);
    }

    // Find appointment
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: doctorId,
    });

    if (!appointment) {
      throw new ApiError("Appointment not found", StatusCodes.NOT_FOUND);
    }

    // Check doctor schedule
    const selectedDate = new Date(appointmentDate);
    const schedule = await Schedule.findOne({
      doctor: doctorId,
      startDate: { $lte: selectedDate },
      endDate: { $gte: selectedDate },
      isHoliday: false,
      isOnLeave: false,
    });

    if (!schedule) {
      throw new ApiError(
        "No schedule found for selected date",
        StatusCodes.BAD_REQUEST
      );
    }

    // ✅ FIX: Convert schedule times to 24-hour format for comparison
    const convertTo24Hour = (time12h: string): string => {
      const [time, period] = time12h.split(' ');
      let [hours, minutes] = time.split(':');

      if (period?.toLowerCase() === 'pm' && hours !== '12') {
        hours = (parseInt(hours) + 12).toString();
      } else if (period?.toLowerCase() === 'am' && hours === '12') {
        hours = '00';
      }

      return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const scheduleStart24 = convertTo24Hour(schedule.startTime);
    const scheduleEnd24 = convertTo24Hour(schedule.endTime);


    // Check if time is within schedule hours (using 24-hour format)
    if (
      appointmentTime < scheduleStart24 ||
      appointmentTime > scheduleEnd24
    ) {
      throw new ApiError(
        `Selected time is outside schedule hours. Available: ${schedule.startTime} - ${schedule.endTime}`,
        StatusCodes.BAD_REQUEST
      );
    }

    // Update appointment with confirmed details
    appointment.status = AppointmentStatus.approved;
    appointment.appointmentDate = selectedDate;
    appointment.appointmentTime = appointmentTime;
    await appointment.save();

    return res.status(StatusCodes.OK).json({
      message: "Appointment confirmed successfully",
      appointment: (appointment as any).appointmentResponse(),
    });
  } catch (error) {
    next(error);
  }
};
export const createPrescription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { appointment_id, medications, expiry_date, instructions } = req.body;
    const files = (req as any).files;
    const doctor_id = req.user?.userId;

    // Validation
    if (!appointment_id || !medications || !expiry_date) {
      throw new ApiError(
        "Appointment ID, medications and expiry date are required",
        StatusCodes.BAD_REQUEST
      );
    }

    // Convert to ObjectId immediately
    const appointmentObjectId = new Types.ObjectId(appointment_id);
    const doctorObjectId = new Types.ObjectId(doctor_id);

    // Find appointment using ObjectId and populate patient details
    const appointment = await Appointment.findOne({
      _id: appointmentObjectId,
      doctor: doctorObjectId,
    }).populate('user', 'name email'); // Populate patient details

    if (!appointment) {
      throw new ApiError("Appointment not found", StatusCodes.NOT_FOUND);
    }

    // Get patient_id from appointment
    const patient_id = (appointment as any).user;

    // Parse medications
    let medicationsArray: IMedication[] = [];
    try {
      medicationsArray =
        typeof medications === "string" ? JSON.parse(medications) : medications;
    } catch (error) {
      throw new ApiError("Invalid medications format", StatusCodes.BAD_REQUEST);
    }

    if (!Array.isArray(medicationsArray) || medicationsArray.length === 0) {
      throw new ApiError(
        "At least one medication is required",
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate expiry date
    const expiryDate = new Date(expiry_date);
    if (expiryDate <= new Date()) {
      throw new ApiError(
        "Expiry date must be in the future",
        StatusCodes.BAD_REQUEST
      );
    }

    // Upload files if any
    const uploadedFiles = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const fileUrl = `/uploads/prescriptions/${appointment_id}/${fileName}`;

        uploadedFiles.push({
          filename: fileName,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size: file.size,
          url: fileUrl,
          uploaded_at: new Date(),
        });
      }
    }

    // Create prescription with proper references
    const prescriptionData = {
      appointment_id: appointmentObjectId,
      patient_id: patient_id, // Actual patient reference
      doctor_id: doctorObjectId,
      medications: medicationsArray.map((med) => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || instructions || "",
      })),
      files: uploadedFiles,
      issue_date: new Date(),
      expiry_date: expiryDate,
      status: PrescriptionStatus.ACTIVE,
    };

    const prescription = await Prescription.create(prescriptionData);

    // Populate the response with appointment and doctor details
    await prescription.populate('appointment_id', 'patientName appointmentType createdAt');
    await prescription.populate('doctor_id', 'username specialization');
    await prescription.populate('patient_id', 'name email');

    return res.status(StatusCodes.CREATED).json({
      message: "Prescription created successfully",
      data: (prescription as any).publicResponse(),
    });
  } catch (error) {
    next(error);
  }
};
export const getDoctorPrescriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const doctor_id = req.user?.userId;

    // Validate doctor_id is a valid string and ObjectId
    if (
      typeof doctor_id !== "string" ||
      !doctor_id.trim() ||
      !Types.ObjectId.isValid(doctor_id)
    ) {
      throw new ApiError(
        "Valid doctor authentication required",
        StatusCodes.UNAUTHORIZED
      );
    }

    const doctorObjectId = new Types.ObjectId(doctor_id);

    const prescriptions = await Prescription.find({
      doctor_id: doctorObjectId,
    }).sort({ created_at: -1 });

    return res.status(StatusCodes.OK).json({
      message: "Doctor prescriptions fetched successfully",
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};