import { Request, Response } from "express";

type GeolocationPosition = {
  coords: {
      latitude: number,
      longitude: number,
      altitude: number,
      accuracy: number,
      altitudeAccuracy: number,
      heading: number,
      speed: number,
  },
  timestamp: number
}

export const logSleep = async (req: Request, res: Response) => {
  try {
    const data: GeolocationPosition = req.body;

    console.log({data});

    res.json({});
  } catch (error) {
    console.log(error);
  }
};
