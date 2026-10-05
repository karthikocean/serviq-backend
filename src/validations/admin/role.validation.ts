import { z } from "zod";

const permissionSchema = z.object({
  view: z.boolean().default(false),
  add: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const createRoleSchema = z.object({
  body: z.object({
    roleName: z.string().min(2, "Role name must be at least 2 characters"),
    permissions: z.record(z.string(), permissionSchema).optional().default({}),
    adminAccess: z.boolean().optional(),
    isAdminAccess: z.boolean().optional(),
    isActive: z.boolean().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  }),
});

export const updateRolePermissionsSchema = z.object({
  body: z.object({
    roleName: z.string().min(2, "Role name must be at least 2 characters").optional(),
    permissions: z.record(z.string(), permissionSchema).optional(),
    adminAccess: z.boolean().optional(),
    isAdminAccess: z.boolean().optional(),
    isActive: z.boolean().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  }),
});
