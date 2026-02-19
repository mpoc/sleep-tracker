import { z } from "zod";

/**
 * Parses JSON strings into structured data and serializes back to JSON. This generic function accepts an output schema to validate the parsed JSON data.
 */
export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

/**
 * Parses JSONL strings into validated arrays and serializes back to JSONL.
 * Accepts a schema for individual items (not an array schema).
 */
export const jsonlCodec = <T extends z.core.$ZodType>(itemSchema: T) =>
  z.codec(z.string(), z.array(itemSchema), {
    decode: (jsonlString, ctx) => {
      try {
        return Bun.JSONL.parse(jsonlString) as z.input<T>[];
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "jsonl",
          input: jsonlString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (items) =>
      items.map((item) => `${JSON.stringify(item)}\n`).join(""),
  });
