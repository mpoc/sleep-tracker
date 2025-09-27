import { ApiError } from './error'
import type { ApiResponse } from "./types";

export const successResponse = (data: object, message: string) => {
  const response: ApiResponse = {
    success: true,
    data,
    message
  }
  return Response.json(response);
}

export const errorResponse = (error: ApiError) => {
  if (error.errorLogData instanceof Error) {
    console.error(error.message + (error.errorLogData ? (':\n\t' + error.errorLogData.toString()) : ""));
  } else {
    console.error(error.message + (error.errorLogData ? (':\n\t' + JSON.stringify(error.errorLogData)) : ""));
  }
  const response: ApiResponse = {
    success: false,
    message: error.message
  };
  return Response.json(response);
};
