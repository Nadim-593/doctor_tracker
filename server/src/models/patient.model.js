import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["female", "male", "other", "undisclosed"],
    },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    condition: { type: String, required: true, trim: true, maxlength: 160 },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    notes: { type: String, trim: true, maxlength: 3000, default: "" },
  },
  { timestamps: true, versionKey: false },
);

patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ createdAt: -1, _id: -1 });
patientSchema.index({ condition: 1, createdAt: -1 });
patientSchema.index({ gender: 1, createdAt: -1 });
patientSchema.index(
  { name: "text", condition: "text", email: "text", phone: "text" },
  { name: "patient_search_text" },
);

export const Patient =
  mongoose.models.Patient || mongoose.model("Patient", patientSchema);
