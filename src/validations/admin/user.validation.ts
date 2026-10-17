import { z } from "zod";

const emptyToUndefined = (val: unknown) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "ALL" || trimmed === "All" || trimmed === "COMPANY" || trimmed === "null" || trimmed === "undefined") {
      return undefined;
    }
    return trimmed;
  }
  if (val === null || val === undefined) return undefined;
  return val;
};

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.preprocess(emptyToUndefined, z.string().email("Invalid email format").optional()),
    phoneNumber: z.preprocess(emptyToUndefined, z.string().min(10, "Phone number must be at least 10 digits").optional()),
    password: z.preprocess(emptyToUndefined, z.string().min(4, "Password must be at least 4 characters").optional()),
    roleId: z.preprocess(emptyToUndefined, z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional()),
    userType: z.enum(["BRANCH_ADMIN", "STAFF", "STATION"]),
    branchId: z.preprocess(emptyToUndefined, z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID").optional()),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phoneNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    roleId: z.preprocess(emptyToUndefined, z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid role ID").optional().nullable()),
    isActive: z.boolean().optional(),
    userType: z.enum(["BRANCH_ADMIN", "STAFF", "STATION"]).optional(),
    branchId: z.preprocess(emptyToUndefined, z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid branch ID").optional().nullable()),
    dutyStatus: z.enum(["ON_DUTY", "OFF_DUTY"]).optional(),
  }),
});
