import { randomUUIDv7 } from "bun";

const NOTIFICATIONS_PATH = "./data/sent-notifications.json";

const file = Bun.file(NOTIFICATIONS_PATH);
if (!(await file.exists())) {
  console.log("No sent-notifications.json found, nothing to migrate.");
  process.exit(0);
}

const data = await file.json();

if (!Array.isArray(data)) {
  console.error("Unexpected format: expected an array.");
  process.exit(1);
}

let migrated = 0;
for (const entry of data) {
  if (!entry.id) {
    entry.id = randomUUIDv7();
    migrated++;
  }
}

await Bun.write(NOTIFICATIONS_PATH, JSON.stringify(data, null, 2));
console.log(
  `Migrated ${migrated} notification(s), ${data.length - migrated} already had IDs.`
);
