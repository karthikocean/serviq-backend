import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional(),
    userType: z.enum(["BRANCH_ADMIN", "STAFF"]),
    branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID").optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.string().optional(),
    roleId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional(),
    isActive: z.boolean().optional(),
    userType: z.enum(["BRANCH_ADMIN", "STAFF"]).optional(),
    branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID").optional(),
  }),
});
