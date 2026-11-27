# AcadPro implementation plan

Status — local implementation in progress. Struck-out items are implemented in the code. Database-backed acceptance checks remain open where noted. The first milestone is a new student activating an account, signing in and seeing the correct courses on a phone.

## 1. Verify identity before granting portal access

Before these changes, Backend/controllers/studentcontroller.js accepts an address ending in @iiitp.ac.in, hashes a password and creates a student. Login accepts email or MIS and issues a seven-day JWT. An address suffix establishes the allowed domain. A delivered challenge establishes mailbox ownership.

- [x] ~~Allow open student signup with any email domain. Use the submitted MIS, department and semester, check existing accounts for duplicate identifiers, and let the student choose a password through the email verification link.~~
- [x] ~~Add a challenge collection with account or pending signup ID, target email, role, purpose, token digest, expiry and consumption time. Generate 32 random bytes on the server, send the raw token in an HTTPS link and store its SHA-256 digest. Start with a 15-minute expiry. Use a configured public app URL. Keep tokens out of logs and analytics.~~
- [x] ~~Add a React activation screen. Opening the link displays a form. Explicit submission posts the token and chosen password. In one transaction, require an unexpired, unused digest bound to the intended action, mark it consumed, hash the password and set emailVerifiedAt. Use unique challenge and account indexes to handle concurrent submissions.~~
- [ ] Add backend-only email delivery through a transactional provider, such as Resend, with a verified sender domain. Keep provider credentials in server secrets. Use a test mailbox in staging. Track delivery failures, allow resend after a cooldown, rate-limit by address and IP, and supersede previous challenges when resending.
  Provider delivery, cooldown, resend supersession and rate limits are implemented. Verify sender setup and delivery to a staging test mailbox.
- [x] ~~Keep email-or-MIS plus password for ordinary student login. Check verification at login and in Backend/middlewares/authmiddleware.js for already-issued sessions. Keep faculty creation under the existing admin route and send a faculty invitation to set a password. Provision admins separately. An email link must never let the recipient select a privileged role.~~
- [ ] Roll out to existing accounts in batches. Inventory missing or duplicate addresses, pilot with known users, verify existing accounts through a separate confirmation flow that preserves their passwords, then enable enforcement. Test the admin recovery path before enforcing staff verification.
  Batch inventory and password-preserving confirmation are implemented. Run a pilot and verify admin recovery before enforcement.
- [x] ~~Add password recovery with its own purpose-bound challenge. Return the same response for known and unknown addresses, invalidate existing sessions after reset, and require fresh verification before replacing a verified email.~~

Acceptance — exercise fresh, expired, reused, resent and concurrently submitted links. Verify that a mail outage is recoverable, a mismatched MIS cannot claim another record, and both existing login identifiers work after activation. Include a staff invite and an old student session in the checks.

## 2. Make academic records consistent across dashboards

| Workflow           | Implementation                                                                                                                                                               | Acceptance check                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Promotion          | ~~Make StudentEnrollment the source for course membership. Update semester, archive prior enrollments and create new ones in a transaction. Make retries idempotent.~~ | Promote a seeded student twice. Old lectures appear in Archived, new subjects appear once in Current, and both faculty rosters reflect the move. |
| Faculty assignment | ~~Scope TeachingAssignment by faculty, subject, semester and academic session. Resolve roster queries from matching active enrollments.~~ | One teacher can teach in two semesters and sees the correct students for each course.                                                            |
| Subject requests   | ~~Normalize course codes, scope uniqueness to the catalog and offering separately, and record approval, assignment and notification consistently.~~ | Submit and approve twice. The admin sees one request, the teacher sees one assignment and eligible students see one offering.                    |
| Lecture publishing | ~~Trace upload, saved lecture metadata and dashboard queries using the same offering ID. Show upload progress, recoverable failures and publish status.~~ | A teacher uploads a lecture, refreshes and plays it. An enrolled student sees it, and an unrelated account cannot access private media directly. |
| Reference lectures | ~~Give shared reference content an explicit audience and separate it from formal enrollment.~~ | A lower-semester student can view an approved reference lecture without appearing on the higher-semester roster.                                 |
| Term rollover      | ~~Preserve the 2026–2027 odd-semester demo fixture. Move active-session selection out of fixed constants in Backend/utils/academicConfig.js and into an admin-managed session.~~ | Activate a new term in staging. Current courses change while historical lectures retain their original session.                                  |

The academic workflows above are implemented. Their database-backed acceptance checks remain open.

## 3. Make the three roles usable on mobile and desktop

- [x] ~~Student home opens to Current with Archived one action away. Show course, teacher, latest lecture and playback action. Give students a clear empty state when enrollment is pending.~~
- [x] ~~Faculty can open a course roster, publish a lecture, see request status and edit permitted profile fields. Admins can review requests and preview affected enrollments before confirming promotion.~~
- [ ] Reuse the existing layout, skeleton and error components. Apply the black, blue and pink palette consistently, check contrast, keyboard focus and form labels, and keep coursework readable on small screens.
  Signup rendered at 390 px and 1280 px with labeled inputs, visible keyboard focus and no horizontal overflow. Complete contrast and accessibility checks across all roles.
- [ ] Verify each flow at phone and desktop widths, with keyboard navigation, slow requests, failed uploads and a page refresh after success.

## 4. Release and demonstrate the project

- [ ] Use separate development, staging and production databases, media storage and email settings. Document required environment-variable names in examples. Validate configuration at startup.
  Environment examples and startup validation are in place. Provision separate staging and production services when deployment work begins.
- [x] ~~Review the bearer-token storage in Frontend/src/context/AuthContext.jsx. Plan expiring, revocable sessions and backend authorization on every private resource. If adopting secure HttpOnly cookies, migrate the API client, CORS and CSRF protection together.~~
- [ ] Run existing Backend/scripts workflow checks against disposable fixtures. Add CI for focused auth and academic regression checks plus the frontend build. Verify a database backup can be restored before the first production migration.
  CI and disposable fixture checks are implemented. The frontend build, frontend lint, all eight backend unit tests and the standalone roster check passed. MongoDB-dependent workflow and restore checks are still pending because the local replica connection was denied.
- [ ] Track failed deliveries, upload failures and approval errors without recording secrets or student records in logs. Record who approved requests or promoted students in the audit log.
- [ ] Publish a synthetic-data demo, setup instructions and a short walkthrough covering activation, lecture publication and promotion. Measure signup completion and time to find a lecture in a small pilot before making résumé claims.
  The isolated demo build and a three-role walkthrough are in the repository. Starting the demo requires access to the local disposable MongoDB replica. Publication and pilot measurements are pending.

Suggested order — deliver student activation end to end first, then promotion and rosters, then approvals and lecture visibility. Polish each flow as it lands. Complete staging recovery checks before onboarding real students.

## Implementation references

- [OWASP email validation and verification](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
- [OWASP password recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
