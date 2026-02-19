import { checkAiNotification } from "../src/aiNotifications";

console.log("Forcing AI notification check...");
await checkAiNotification();
console.log("Done.");
