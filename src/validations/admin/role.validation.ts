import { z } from "zod";

const permissionSchema = z.object({
  view: z.boolean(),
  add: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

export const updateRolePermissionsSchema = z.object({
  body: z.object({
    roleName: z.string().optional(),
    permissions: z.record(z.string(), permissionSchema),
  }),
});

export const createRoleSchema = z.object({
  body: z.object({
    roleName: z.string().min(2, "Role name must be at least 2 characters"),
    permissions: z.record(z.string(), permissionSchema),
  }),
});
