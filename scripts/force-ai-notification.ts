import { checkAiNotification } from "../src/aiNotifications";

console.log("Forcing AI notification...");
await checkAiNotification({ force: true });
console.log("Done.");
