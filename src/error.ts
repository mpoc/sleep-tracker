import type { Response } from "express";
import { errorResponse } from './apiUtils';

export class ApiError extends Error {
  errorLogData?: any;

  constructor(message: string, errorLogData?: any) {
    super();
    this.message = message;
    if (errorLogData instanceof ApiError) {
      // Prefer lower-end error messages
      this.message = errorLogData.message;
      this.errorLogData = errorLogData.errorLogData;
    } else {
      this.errorLogData = errorLogData;
    }
  }
}

export const handleError = (res: Response, error: Error) => {
  if (error instanceof ApiError) {
    errorResponse(res, error);
  } else {
    errorResponse(res, new ApiError("Unknown error", error));
  }
}
