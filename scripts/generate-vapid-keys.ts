import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import webPush from "web-push";

const SECRET_DIR = "./secret";
const VAPID_KEYS_PATH = `${SECRET_DIR}/vapid-keys.json`;

if (existsSync(VAPID_KEYS_PATH)) {
  console.log(`VAPID keys already exist at ${VAPID_KEYS_PATH}`);
  console.log("Delete the file if you want to regenerate keys.");
  process.exit(0);
}

const vapidKeys = webPush.generateVAPIDKeys();

await mkdir(SECRET_DIR, { recursive: true });
await writeFile(VAPID_KEYS_PATH, JSON.stringify(vapidKeys, null, 2));

console.log(`VAPID keys generated and saved to ${VAPID_KEYS_PATH}`);
console.log("\nPublic key (for frontend):");
console.log(vapidKeys.publicKey);
