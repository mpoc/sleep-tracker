import { Request, Response } from "express";

export const logSleep = async (req: Request, res: Response) => {
  try {
    res.json({});
  } catch (error) {
    console.log(error);
  }
};
