import { Response } from "express";
import { StatusCodes } from "http-status-codes";

export interface PaginationResult<T> {
  success: boolean;
  message: string;
  total: number;
  from: number;
  to: number;
  totalPages: number;
  currentPage: number;
  data: T[];
}

export function pagination<T>(
  totalCount: number,
  data: T[],
  limit: number,
  page: number, // 0-based page index
  res: Response,
  message: string = "Data fetched successfully"
): void {
  try {
    const currentPage = page + 1; // convert to 1-based for response
    const totalPages = Math.ceil(totalCount / limit);

    const from = totalCount === 0 ? 0 : page * limit + 1;
    const to = totalCount === 0 ? 0 : Math.min(page * limit + data.length, totalCount);

    res.status(StatusCodes.OK).json({
      success: true,
      message,
      total: totalCount,
      from,
      to,
      totalPages,
      currentPage,
      data
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Pagination error",
      errors: null
    });
  }
}
