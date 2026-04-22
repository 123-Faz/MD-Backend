import Doctor from "@/models/Doctor";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { NextFunction, Request, Response } from "express";
import Appointment from "@/models/Appointments";
import Prescription from "@/models/Prescriptions";
import { Types } from "mongoose";
import User from "@/models/User";


export const getAllDoctors = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Add _id to the select fields
    const doctors = await Doctor.find({}).select('_id username specialization experience')
    return res.status(StatusCodes.OK).json(doctors)
  }
  catch (error) {
    next(error)
  }
}

// export const requestAppointment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
//     try {
//         const errors: {
//             doctorId?: string;
//             patientName?: string;
//             appointmentType?: string;
//             symptoms?: string;
//         } = {};

//         const { doctorId, patientName, appointmentType, symptoms, notes } = req.body;

//         // Validation
//         !doctorId ? errors.doctorId = "Doctor selection is required" : null;
//         !patientName ? errors.patientName = "Patient name is required" : null;
//         !appointmentType ? errors.appointmentType = "Appointment type is required" : null;
//         !symptoms ? errors.symptoms = "Symptoms description is required" : null;

//         if (Object.keys(errors).length > 0) {
//             throw new ApiError(errors, StatusCodes.BAD_REQUEST);
//         }

//         // Check if doctor exists
//         const doctor = await Doctor.findById(doctorId);
//         if (!doctor) {
//             throw new ApiError("Doctor not found", StatusCodes.NOT_FOUND);
//         }

//         // Create appointment
//         const appointment = new Appointment({
//             doctor: doctorId,
//             patientName,
//             appointmentType,
//             symptoms,
//             notes: notes || ""
//         });

//         await appointment.save();

//         // Manual response
//         const response = {
//             _id: appointment._id,
//             doctor: appointment.doctor,
//             patientName: appointment.patientName,
//             appointmentType: appointment.appointmentType,
//             symptoms: appointment.symptoms,
//             notes: appointment.notes,
//             status: "pending",
//         };

//         return res.status(StatusCodes.CREATED).json({
//             message: "Appointment request sent successfully",
//             appointment: response
//         });

//     } catch (error) {
//         next(error);
//     }
// };
export const requestAppointment = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const errors: {
      doctorId?: string;
      patientName?: string;
      appointmentType?: string;
      symptoms?: string;
    } = {};

    const { doctorId, patientName, appointmentType, symptoms, notes } = req.body;

    // Get authenticated user from middleware - use req.user directly
    const user = req.user;

    if (!user) {
      throw new ApiError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    // Get user ID from the JWT payload - check different possible properties
    const userId = user._id || user.id || user.userId;

    if (!userId) {
      throw new ApiError("User ID not found in token", StatusCodes.UNAUTHORIZED);
    }

    // Validation
    if (!doctorId || typeof doctorId !== 'string') {
      errors.doctorId = "Valid doctor selection is required";
    }
    if (!patientName || typeof patientName !== 'string' || !patientName.trim()) {
      errors.patientName = "Valid patient name is required";
    }
    if (!appointmentType || typeof appointmentType !== 'string') {
      errors.appointmentType = "Valid appointment type is required";
    }
    if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
      errors.symptoms = "Valid symptoms description is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(errors, StatusCodes.BAD_REQUEST);
    }

    // Sanitize inputs
    const sanitizedPatientName = patientName.trim();
    const sanitizedSymptoms = symptoms.trim();
    const sanitizedNotes = notes ? notes.trim() : "";

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new ApiError("Doctor not found", StatusCodes.NOT_FOUND);
    }

    // Verify user exists (additional security check)
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      throw new ApiError("User not found", StatusCodes.NOT_FOUND);
    }

    // Create appointment with automatic user ID from authentication
    const appointment = new Appointment({
      user: userId,
      doctor: doctorId,
      patientName: sanitizedPatientName,
      appointmentType,
      symptoms: sanitizedSymptoms,
      notes: sanitizedNotes
    });

    await appointment.save();

    // Populate doctor details for better response
    await appointment.populate('doctor', 'name email specialization consultationFee hospital');

    return res.status(StatusCodes.CREATED).json({
      message: "Appointment request sent successfully",
      appointment: (appointment as any).appointmentResponse()
    });

  } catch (error) {
    console.error('Error in requestAppointment:', error);
    next(error);
  }
};

export const getUserAppointments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Get authenticated user from middleware
    const user = req.user;

    if (!user) {
      throw new ApiError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    // Get user ID from JWT payload
    const userId = user._id || user.id || user.userId;

    if (!userId) {
      throw new ApiError("User ID not found in token", StatusCodes.UNAUTHORIZED);
    }

    // Fetch all appointments for this specific user
    const appointments = await Appointment.find({ user: userId })
      .populate('doctor', 'username')
      .sort({ createdAt: -1 });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Appointments fetched successfully",
      count: appointments.length,
      data: appointments
    });

  } catch (error) {
    console.error('Error in getUserAppointments:', error);
    next(error);
  }
};

const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const getPatientPrescriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { appointment_id } = req.query;
    const user = req.user;

    if (!user) {
      throw new ApiError("Authentication required", StatusCodes.UNAUTHORIZED);
    }

    const userId = user._id || user.id || user.userId;

    if (!userId) {
      throw new ApiError("User ID not found in token", StatusCodes.UNAUTHORIZED);
    }

    console.log('Query appointment_id:', appointment_id);

    // If no appointment_id provided, get all prescriptions for user's appointments
    if (!appointment_id) {
      // Get all appointments for the user
      const userAppointments = await Appointment.find({ user: userId }).select('_id');
      const appointmentIds = userAppointments.map(apt => apt._id);

      // Get prescriptions for all user's appointments
      const prescriptions = await Prescription.find({
        appointment_id: { $in: appointmentIds }
      })
        .populate('doctor_id', 'username specialization experience')
        .populate('appointment_id', 'patientName appointmentType createdAt')
        .sort({ issue_date: -1 });

      const prescriptionsData = prescriptions.map(prescription => ({
        _id: prescription._id,
        appointment: {
          _id: (prescription.appointment_id as any)?._id,
          patientName: (prescription.appointment_id as any)?.patientName,
          appointmentType: (prescription.appointment_id as any)?.appointmentType,
          appointmentDate: (prescription.appointment_id as any)?.createdAt
        },
        doctor: prescription.doctor_id ? {
          _id: (prescription.doctor_id as any)?._id,
          name: (prescription.doctor_id as any)?.username,
          specialization: (prescription.doctor_id as any)?.specialization,
          experience: (prescription.doctor_id as any)?.experience
        } : null,
        medications: prescription.medications,
        files: prescription.files,
        issue_date: prescription.issue_date,
        expiry_date: prescription.expiry_date,
        status: prescription.status
      }));

      return res.status(StatusCodes.OK).json({
        message: "Prescriptions fetched successfully",
        data: prescriptionsData
      });
    }

    // If appointment_id is provided, validate it
    if (!isValidString(appointment_id)) {
      throw new ApiError("Valid appointment ID is required", StatusCodes.BAD_REQUEST);
    }

    if (!Types.ObjectId.isValid(appointment_id)) {
      throw new ApiError("Invalid appointment ID format", StatusCodes.BAD_REQUEST);
    }

    const appointmentObjectId = new Types.ObjectId(appointment_id as string);

    // Verify the appointment belongs to the authenticated user
    const appointment = await Appointment.findOne({
      _id: appointmentObjectId,
      user: userId
    });

    if (!appointment) {
      throw new ApiError("Appointment not found or access denied", StatusCodes.NOT_FOUND);
    }

    // Get prescriptions for this specific appointment
    const prescriptions = await Prescription.find({
      appointment_id: appointmentObjectId
    })
      .populate('doctor_id', 'username specialization experience')
      .populate('appointment_id', 'patientName appointmentType createdAt')
      .sort({ issue_date: -1 });

    console.log('Found prescriptions:', prescriptions.length);

    if (prescriptions.length === 0) {
      return res.status(StatusCodes.OK).json({
        message: "No prescriptions found for this appointment",
        data: []
      });
    }

    // Enhanced response with appointment details
    const prescriptionsData = prescriptions.map(prescription => ({
      _id: prescription._id,
      appointment: {
        _id: (prescription.appointment_id as any)?._id,
        patientName: (prescription.appointment_id as any)?.patientName,
        appointmentType: (prescription.appointment_id as any)?.appointmentType,
        appointmentDate: (prescription.appointment_id as any)?.createdAt
      },
      doctor: prescription.doctor_id ? {
        _id: (prescription.doctor_id as any)?._id,
        name: (prescription.doctor_id as any)?.username,
        specialization: (prescription.doctor_id as any)?.specialization,
        experience: (prescription.doctor_id as any)?.experience
      } : null,
      medications: prescription.medications,
      files: prescription.files,
      issue_date: prescription.issue_date,
      expiry_date: prescription.expiry_date,
      status: prescription.status
    }));

    return res.status(StatusCodes.OK).json({
      message: "Prescriptions fetched successfully",
      data: prescriptionsData
    });

  } catch (error) {
    next(error);
  }
};