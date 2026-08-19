import { z } from "zod";

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email format").optional(),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional(),
    dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY']).optional(),
    kitchenPin: z.string().length(4, "Kitchen PIN must be exactly 4 digits").optional(),
    autoAccept: z.boolean().optional(),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional().nullable(),
    isActive: z.boolean().optional(),
    dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY']).optional(),
    kitchenPin: z.string().length(4, "Kitchen PIN must be exactly 4 digits").optional(),
    autoAccept: z.boolean().optional(),
  }),
});

export const updateDutyStatusSchema = z.object({
  body: z.object({
    dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY']),
  }),
});
