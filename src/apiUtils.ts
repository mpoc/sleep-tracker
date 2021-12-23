import { Response } from "express";
import { ApiError } from './error'

type ApiResponse = {
  success: boolean,
  data?: object,
  message?: string
}

export const successResponse = (res: Response, data: object, message: string) => {
  const response: ApiResponse = {
    success: true,
    data,
    message
  }
  res.status(200).json(response);
}

export const errorResponse = (res: Response, error: ApiError) => {
  if (error.errorLogData instanceof Error) {
    console.error(error.message + (error.errorLogData ? (':\n\t' + error.errorLogData.toString()) : ""));
  } else {
    console.error(error.message + (error.errorLogData ? (':\n\t' + JSON.stringify(error.errorLogData)) : ""));
  }
  const response: ApiResponse = {
    success: false,
    message: error.message
  };
  res.status(500).json(response);
};
