import { mkdir } from "node:fs/promises";

export const DATA_DIR = "./data";
await mkdir(DATA_DIR, { recursive: true });
