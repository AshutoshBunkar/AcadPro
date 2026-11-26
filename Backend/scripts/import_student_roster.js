import { readFile } from "node:fs/promises";
import { parseRoster } from "../utils/roster.js";

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file || (flag && flag !== "--apply")) throw new Error("Usage: node scripts/import_student_roster.js roster.json [--apply]");
  const rows = parseRoster(JSON.parse(await readFile(file, "utf8")));
  if (!flag) return console.log("Validated rows:", rows.length);
  await import("dotenv/config");
  const { default: mongoose } = await import("mongoose");
  const { StudentRoster } = await import("../models/StudentRoster.js");
  await mongoose.connect(process.env.MONGO_DB_URL);
  try {
    await StudentRoster.createIndexes();
    await mongoose.connection.transaction(async session => {
      for (const { email, mis, ...details } of rows) {
        await StudentRoster.updateOne({ email, mis }, { $set: details }, { upsert: true, session });
      }
    });
    console.log("Imported rows:", rows.length);
  } finally {
    await mongoose.disconnect();
  }
}
main().catch(error => {
  console.error(error.code === 11000 ? "Import rolled back. An identity conflicts with the saved roster." : error.message);
  process.exitCode = 1;
});
