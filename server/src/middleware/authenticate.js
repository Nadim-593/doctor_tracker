import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { cookieName } from "../services/auth.service.js";
import { Admin } from "../models/admin.model.js";

export async function authenticate(request, _response, next) {
  try {
    const token = request.cookies?.[cookieName];
    if (!token)
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        issuer: "doctor-tracker",
        audience: "doctor-tracker-admin",
      });
    } catch {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Your session has expired. Please sign in again.",
      );
    }
    const admin = await Admin.findById(payload.sub).select("email").lean();
    if (!admin)
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Your session has expired. Please sign in again.",
      );
    request.admin = { id: admin._id, email: admin.email };
    next();
  } catch (error) {
    next(error);
  }
}
