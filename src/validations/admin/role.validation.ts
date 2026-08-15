import { z } from "zod";

const permissionSchema = z.object({
  view: z.boolean(),
  add: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});

export const updateRolePermissionsSchema = z.object({
  body: z.object({
    permissions: z.record(z.string(), permissionSchema),
  }),
});
