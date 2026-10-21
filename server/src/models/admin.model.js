import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, versionKey: false });

export const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
