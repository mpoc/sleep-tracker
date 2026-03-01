import { z } from "zod";

export const env = z
  .object({
    API_KEY: z.string().min(1),
    SPREADSHEET_ID: z.string().min(1),
    SPREADSHEET_RANGE: z.string().min(1),
    PUSHBULLET_API_KEY: z.string().optional(),
    PUSHBULLET_ENABLED: z.stringbool(),
    WEB_PUSH_ENABLED: z.stringbool(),
    AI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().optional().default("google/gemini-3-flash-preview"),
    AI_CRON_SCHEDULE: z.string().optional().default("*/20 8-23,0-1 * * *"),
    AI_NOTIFICATIONS_ENABLED: z.stringbool().optional().default("false"),
  })
  .parse(process.env);
