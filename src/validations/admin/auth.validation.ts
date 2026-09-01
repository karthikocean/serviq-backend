import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(4, "New password must be at least 4 characters long"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().min(4, "OTP must be at least 4 characters long"),
    newPassword: z.string().min(4, "New password must be at least 4 characters long"),
  }),
});

export const forgotPinSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
  }),
});

export const resetPinSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().min(4, "OTP must be at least 4 characters long"),
    newPin: z.string().min(4, "New PIN must be at least 4 characters long"),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().min(4, "OTP must be at least 4 characters long"),
  }),
});
