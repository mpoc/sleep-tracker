import z from "zod";

const ProcessEnvSchema = z.object({
  API_KEY: z.string().min(1),
  SPREADSHEET_ID: z.string().min(1),
  SPREADSHEET_RANGE: z.string().min(1),
  PUSHBULLET_API_KEY: z.string().min(1),
});

export const env = ProcessEnvSchema.parse(process.env);
