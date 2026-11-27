# Student activation pilot

Use a staging MongoDB replica set or Atlas database. Set MONGO_DB_URL, JWT_SECRET, PUBLIC_APP_URL (HTTPS frontend origin), RESEND_API_KEY and ACTIVATION_FROM (verified sender) in the backend environment. Configure SPA fallback on the frontend host for /activate. Configure trusted proxy hops to match the deployment before testing per-client IP limits.

From Backend, use node scripts/import_student_roster.js roster.json to validate a private JSON array. Each row contains name, email, mis (a string preserving leading zeros), department and an integer semester from 1 to 8. Run the same command with --apply to import the approved roster transactionally. Keep real roster files outside the repository.

Request a link at /signup, submit a password from the inbox and sign in with email or MIS. If a message fails, retry after one minute. Staff and existing student passwords keep working during the pilot. Existing students require a separate verification migration before enforcing verification globally. Enrollment still uses the portal's academic workflows.

Run node scripts/test_student_roster.mjs for normalization and duplicate-mapping checks. Before rollout, test real delivery, concurrent submissions, expired and superseded links, and course visibility in staging.
