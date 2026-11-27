# AcadPro account access and email delivery

Investigation date **27 November 2026**. Scope covers the local development portal, its configured Atlas database, and its outbound account emails. This is a proposed repair plan.

## What is blocking testing today

The configured Atlas URI points to the Ashu-B cluster and omits a database name. The backend supplies no database override, so the effective database is `test`. A read-only Atlas check found 17 collections there.

| Collection | Observed count | Consequence |
| --- | ---: | --- |
| studentrosters | 1, still awaiting activation | Only the email and MIS on this row qualify for student signup. Preserve leading zeros in the MIS. |
| students | 0 | A student can request initial activation. No student can currently request a password reset or legacy account confirmation. |
| faculties and admins | 0 each | No faculty or admin can reset or confirm an account here. Nobody can currently sign into this database as admin to invite faculty. |
| accountchallenges | 0 | No retained token record was available to trace. Records expire after 15 minutes and are removed by a TTL index, so this count cannot establish the history of prior sends. |

These counts explain the existing-account failures for this database. The exact cause of the reported missing **activation email** is still open. The screenshot has no submitted identifiers, browser URL, or network response. Direct localhost probes from the investigation environment were denied and its direct Atlas connection timed out. Atlas counts above came from a separate read-only connection. The running server's environment, the user's SendGrid dashboard, and inbox delivery were not independently observed.

## Trace of the reported flows

| User action | Implemented behavior | Where the flow stops |
| --- | --- | --- |
| Create student account | The login link opens `/signup`. The form posts email and MIS to `/student/signup`. An exact match on an unactivated roster row triggers a link to `/activate`. Submitting that link and a password creates the verified student and enrolls them in matching offerings in one transaction. | An unknown pair, partial match, or activated row gets a generic HTTP 202. No activation email is issued. A partial match can notify existing admins, of which there are currently zero. A password must be at least 12 characters and at most 72 UTF-8 bytes. |
| Add a student as admin | The dashboard and admin routes support editing, removing, or enrolling an existing student. The available registrar workflow is a JSON roster import using `Backend/scripts/import_student_roster.js`. | The portal lacks an admin action to add a roster entry. Course enrollment cannot create a student identity. Even an admin UI fix requires a first admin for this database. |
| Forgot password | `/account/reset/request` sends a link only for an existing account with `emailVerifiedAt`. Completion sets a new password and increments the session version. | No eligible accounts exist. An unverified legacy account also needs confirmation before it can reset. The request returns the same acknowledgement for unknown addresses. |
| Verify existing account | `/account/confirm/request` handles an existing unverified student, faculty member, or admin. Pending faculty use the separate invitation flow. | A roster entry is insufficient. The student gets verified during initial activation. Requesting confirmation before activation generates no email. |
| Verify a changed email | Admin edits can issue a link to the proposed address. Completion at `/account/email/complete` updates the address. | Opening `/account/email` without the token fragment shows a heading and back link without a recovery explanation. The implemented mechanism across these flows is a one-time email link. There is no numeric OTP entry screen. |

The three login links have matching frontend routes and backend handlers. The clearest UI defect is the wording **Create student account**, which implies that any new student can register. The signup form explains the roster requirement only after submission. The README also describes institutional-domain signup, while the active validator accepts other valid email domains.

## Why SendGrid can look empty

The backend environment file contains both provider keys and a syntactically valid SendGrid sender address. SendGrid takes priority when its key is present. The staging mailbox override is absent. The frontend API origin is configured as `http://localhost:10000`. With no explicit public app URL in the backend file, the allowed browser origin and generated link origin default to `http://localhost:5173`. Starting Vite on another port or using 127.0.0.1 can prevent the browser request from reaching the handler successfully. A localhost link also points back to whichever device opens it.

| Observation on the next controlled attempt | Interpretation and next check |
| --- | --- |
| No POST, failed preflight, network error, or HTTP 403 | Check the actual page origin, API listener and browser Network panel first. Record status and timestamp. |
| HTTP 400, 429, or 503 | Check submitted fields, the request limit of 15 per minute per IP or email bucket, or the backend's mail configuration respectively. A database or server error also needs the backend error log. |
| HTTP 202 with no fresh challenge | Compare the normalized identifiers and account state in the running app's database. A repeated request within 60 seconds can also reuse the cooldown window and skip the send. |
| Fresh challenge marked failed or persistently pending | The backend stores pending before the provider call. A failure sets failed, but the code retains no provider status, response reason, or message ID. A process interruption can leave pending. Inspect the backend immediately after one request. |
| Fresh challenge marked sent | The provider accepted the API request. Check Email Activity in the account that owns the selected key, clear time and recipient filters, and follow the message through delivery, bounce, or suppression before checking the inbox and spam folder. |

The public API also returns HTTP 202 after a provider rejection or network timeout. The backend logs only `account_email_delivery_failed`. The key's Mail Send permission, verified sender identity, and active SendGrid account are still unverified. For local testing, SendGrid supports verifying one sender address without owning a domain. [Twilio Single Sender Verification](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification)

## Proposed repair order and acceptance checks

1. **Pin down the running environment.** Confirm the backend's effective database name, frontend origin, API port, and selected transport using credential-free startup diagnostics. Keep the existing roster available. Review any database-name change before applying it, since switching names alone would hide the existing data. Verify that a browser submission reaches the intended API.
2. **Restore the operator's view of email.** Record a request ID, purpose, eligibility or cooldown outcome, provider, sanitized failure reason, HTTP status, and provider message ID when supplied. Keep public responses generic. Never log API keys, raw links, token fragments, passwords, or full request bodies. Test a rejection and a timeout with a mock, then trace one eligible activation to a controlled inbox during the implementation phase.
3. **Make student provisioning usable.** Establish the first admin through an operator-controlled bootstrap. Add an admin-only roster form and endpoint using the existing validation for name, email, MIS, department, and semester. Preserve MIS as text and report duplicate or conflicting identities to the admin. Verify that adding a row twice creates only one roster record and activation creates exactly one student. Keep the existing bulk import path.
4. **Clarify the account paths.** Label signup “Activate student account” and explain the approved email/MIS requirement before submission. Provide links between activation, existing-account confirmation, faculty invitation, and reset. Explain expired or incomplete links and the resend delay. Give changed-email users a recovery instruction when the fragment is missing. Use link terminology throughout and align the README and login placeholder with supported email domains.
5. **Check the verification rollout.** The backend file leaves `VERIFY_ROLES` unset. In that configuration, ordinary legacy accounts can pass the verification gate on login, yet reset still requires a verified address. Review legacy accounts and test confirmation before enabling enforcement for the intended roles. Test a verified reset, sign-in with the new password, invalidation of the old session, and rejection of reused links. Also test a pending faculty invitation and confirmation of a changed address.
6. **Isolate automated mail tests.** The portal integration test and demo mock only the Resend URL. Their fixture config sets a fake Resend key, but the app can also load the local SendGrid key and prefer it. Isolate both transports before running these suites with local credentials present. Verify that all synthetic delivery stays inside the fixture, then run the full workflow suite. Use a separate explicitly approved mailbox test for real SendGrid delivery.

## Evidence and test baseline

All **9 account unit tests passed** using mocked dependencies, including SendGrid request construction, cooldown, unmatched identities, token validation, and browser-origin protection. No external email was sent during this review. No accounts or roster rows were created.

| Area | Files reviewed |
| --- | --- |
| Login, forms and API origin | `Frontend/src/pages/LoginPage.jsx`, `SignupPage.jsx`, `AccountLinkPage.jsx`, `Frontend/src/App.jsx`, `Frontend/src/api/auth.js`, `axios.js` |
| Eligibility, completion and delivery | `Backend/controllers/accountActions.js`, `Backend/utils/challenges.js`, `accountAccess.js`, `browserSession.js`, `Backend/models/AccountChallenge.js` |
| Admin provisioning and data | `Backend/routes/adminRoutes.js`, `Backend/controllers/admincontroller.js`, `Backend/models/StudentRoster.js`, `Backend/scripts/import_student_roster.js` |
| Runtime and test setup | `Backend/app.js`, `Backend/index.js`, `Backend/middlewares/activationLimit.js`, `Backend/scripts/test_account_logic.js`, `test_portal.js`, `demoFixture.js` |
