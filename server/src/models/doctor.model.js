import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  specialization: { type: String, required: true, trim: true, maxlength: 100 },
  hospital: { type: String, trim: true, maxlength: 160, default: "" },
  phone: { type: String, required: true, trim: true, maxlength: 32 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
}, { timestamps: true, versionKey: false });

doctorSchema.index({ email: 1 }, { unique: true });
doctorSchema.index({ createdAt: -1, _id: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1 });
doctorSchema.index({ name: "text", specialization: "text", hospital: "text", email: "text", phone: "text" }, { name: "doctor_search_text" });

export const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);
