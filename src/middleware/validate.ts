import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response";
import { StatusCodes } from "http-status-codes";

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors to match CTN backend style
        const formattedErrors = error.issues.map((err: any) => {
          let msg = err.message;
          if (err.code === "invalid_type" && err.received === "undefined") {
            const field = err.path[err.path.length - 1];
            msg = `${field} is required`;
          }
          
          return {
            field: err.path.join("."),
            value: req.body[err.path[err.path.length - 1]] || req.query[err.path[err.path.length - 1]] || req.params[err.path[err.path.length - 1]] || undefined,
            message: msg
          };
        });
        
        sendError(res, "Validation failed", StatusCodes.BAD_REQUEST, formattedErrors);
      } else {
        sendError(res, "Internal validation error", StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }
  };
};
