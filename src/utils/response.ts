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
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
