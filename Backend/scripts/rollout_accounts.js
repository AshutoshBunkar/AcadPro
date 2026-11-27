import "dotenv/config";
import mongoose from "mongoose";
import { accounts } from "../controllers/accountActions.js";
import { issueChallenge, validEmail } from "../utils/challenges.js";

const [role, ...ids] = process.argv.slice(2);
if (!Object.hasOwn(accounts, role) || ids.length > 50 || ids.some(id => !mongoose.isObjectIdOrHexString(id))) {
  throw Error("Usage: node scripts/rollout_accounts.js student|faculty|admin [up to 50 reviewed account IDs]");
}
await mongoose.connect(process.env.MONGO_DB_URL);
try {
  const rows = await accounts[role].find().select("email emailVerifiedAt invitationPending");
  const counts = new Map();
  for (const row of rows) {
    const key = row.email?.trim().toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const eligible = rows.filter(row => !row.emailVerifiedAt && !row.invitationPending &&
    validEmail(row.email) && counts.get(row.email.trim().toLowerCase()) === 1);
  console.log(JSON.stringify({ total: rows.length, eligible: eligible.length, missingOrInvalid: rows.filter(row => !validEmail(row.email)).length,
    duplicateAddresses: [...counts.values()].filter(n => n > 1).length }));
  const batch = eligible.filter(row => ids.includes(String(row._id)));
  if (batch.length !== new Set(ids).size) throw Error("Batch includes an ineligible or unknown account. Review the directory.");
  for (const row of batch) await issueChallenge(row, role, "confirm");
} finally { await mongoose.disconnect(); }
