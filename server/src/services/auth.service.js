import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

const cookieName = "doctor_tracker_session";
const cookiePath = "/api/v1";
// Used to keep the missing-account login path close to the normal bcrypt cost.
const dummyHash = "$2b$12$TyTYi/3vHApJbAvTgHmeqOJlILwBBsKZ5Mhwq/IrjGDweVMXzGm1K";

function cookieOptions() {
  return { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.NODE_ENV === "production" ? "none" : "lax", path: cookiePath };
}

export async function login(email, password, response) {
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  const valid = await bcrypt.compare(password, admin?.passwordHash || dummyHash);
  if (!admin || !valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  const token = jwt.sign({ sub: admin.id, email: admin.email }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, issuer: "doctor-tracker", audience: "doctor-tracker-admin" });
  const expiresAt = jwt.decode(token).exp * 1000;
  response.cookie(cookieName, token, { ...cookieOptions(), maxAge: Math.max(0, expiresAt - Date.now()) });
  return { admin: { id: admin.id, email: admin.email } };
}

export function logout(response) {
  response.clearCookie(cookieName, cookieOptions());
}

export async function getSession(adminId) {
  const admin = await Admin.findById(adminId).select("email").lean();
  if (!admin) throw new AppError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  return { id: admin._id, email: admin.email };
}

export { cookieName };
