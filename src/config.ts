import { z } from "zod";

export const env = z
  .object({
    API_KEY: z.string().min(1),
    SPREADSHEET_ID: z.string().min(1),
    SPREADSHEET_RANGE: z.string().min(1),
    PUSHBULLET_API_KEY: z.string().min(1),
  })
  .parse(process.env);
