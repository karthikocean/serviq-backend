import { Response } from "express";
import { StatusCodes } from "http-status-codes";

export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode: number = StatusCodes.OK
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = StatusCodes.BAD_REQUEST,
  errors: any = null
): void => {
  // Intercept MongoDB duplicate key error string
  if (typeof message === 'string' && message.includes('E11000 duplicate key error')) {
    const match = message.match(/dup key: \{ ([a-zA-Z0-9_]+):/);
    const field = match ? match[1] : 'Record';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = StatusCodes.CONFLICT;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
