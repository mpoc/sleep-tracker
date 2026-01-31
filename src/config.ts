import { z } from "zod";

export const env = z
  .object({
    API_KEY: z.string().min(1),
    SPREADSHEET_ID: z.string().min(1),
    SPREADSHEET_RANGE: z.string().min(1),
    PUSHBULLET_API_KEY: z.string().optional(),
    PUSHBULLET_ENABLED: z.stringbool(),
    WEB_PUSH_ENABLED: z.stringbool(),
  })
  .parse(process.env);
