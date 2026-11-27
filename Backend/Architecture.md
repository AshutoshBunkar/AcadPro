# AcadPro — Architecture

A lecture library for a college. Students who miss part of a class (distraction, absence, whatever) can go back and watch that content, organized the way their courses are actually structured: **subject → topic → lecture**.

Roles: **Student**, **Faculty**, **Admin**.

---

## 1. Tech Stack

- **Runtime:** Node.js (ES Modules — `import`/`export` throughout, all relative imports require explicit `.js` extensions)
- **Framework:** Express
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Auth:** JWT (`jsonwebtoken`), password hashing via `bcrypt`
- **File upload:** `express-fileupload` (temp files) → Cloudinary (`cloudinary` SDK) for video storage
- **API testing:** Postman

---

## 2. Roles & Permissions

| Role | Can do |
|---|---|
| **Student** | Sign up (self-service, college-email-gated), log in, browse subjects/topics/lectures, post comments (questions) |
| **Faculty** | Log in (account created by Admin only — no self-signup), view profile + current teaching assignments, create topics, upload lectures — *only* for subjects they're currently assigned to teach, reply to comments on lectures they personally uploaded |
| **Admin** | Log in (seeded manually, no self-signup or admin-creates-admin flow), create Faculty accounts, create Subjects, assign Faculty to Subjects per academic year/semester, promote students between years, set the current academic session |

**Why no Faculty/Admin self-signup:** prevents a student from disguising as faculty by simply registering. Faculty accounts are only ever created *by* an already-authenticated Admin. The very first Admin account is bootstrapped by manually inserting a pre-bcrypt-hashed document directly into MongoDB Atlas — there's no code path that creates an Admin.

---

## 3. Data Model (9 collections)

```
Student ──┐                    Admin
          │                      │
          ▼                      │ creates
       Comment ◄── writes        ▼
          │                   Faculty ──┐
          │ (embedded replies)          │ uploads
          ▼                             ▼
       [facultyId, text]             Lecture
                                         │
                                         │ belongs to
                                         ▼
                                       Topic
                                         │
                                         │ belongs to
                                         ▼
                                      Subject ◄── covered by ── TeachingAssignment ── assigned ── Faculty
                                                                       │                              ▲
                                                                       │ compared against               │
                                                                       ▼                              creates
                                                                AcademicSession ◄──────────────────── Admin
```

| Collection | Key fields |
|---|---|
| **Student** | name, email, password, mis, department, year (1–4) |
| **Faculty** | name, email, password |
| **Admin** | email, password |
| **Subject** | name, code (unique), department, year |
| **Topic** | subjectId (ref), name, order |
| **Lecture** | topicId (ref), uploadedBy (ref Faculty), title, description, videoUrl, cloudinaryPublicId, thumbnailUrl, duration, createdAt |
| **Comment** | lectureId (ref), studentId (ref), text, createdAt, embedded `replies[]` (facultyId, text, createdAt) |
| **TeachingAssignment** | facultyId (ref), subjectId (ref), academicYear (String), semester (Number, 1 or 2) |
| **AcademicSession** | academicYear (String), semester (Number, enum [1,2]) — **single document**, represents "what term is it right now" college-wide |

**Auth hashing:** `Admin` and `Faculty` hash passwords automatically via a Mongoose `pre("save")` hook. `Student` hashes manually inside the signup controller. All three models expose an `isPasswordCorrect(password)` instance method wrapping `bcrypt.compare`.

Students self-register and verify their email before choosing a password. Any email domain is accepted.

**Not built (deliberately shelved):**
- `WatchHistory` — explicitly deferred to v2.

---

## 4. Key Design Decisions

- **No sections.** The college has sections with different faculty per section, but the app doesn't model that. *Any* assigned faculty can upload for a subject; students see all lectures for a topic regardless of section, distinguished only by an "uploaded by [name]" label (the existing `uploadedBy` ref).
- **TeachingAssignment is separate from Faculty** because faculty-subject pairing changes every semester (e.g. different faculty teaching the same subject in different terms). A static field on `Faculty` couldn't capture that.
- **Semester-aware assignments.** The college runs 2 semesters/year across a 4-year, 8-semester program. `TeachingAssignment` carries both `academicYear` and `semester`. Subjects themselves **do not** change between semesters (same subject, only the assigned faculty rotates) — so `Subject` and `Student` do not carry a semester field; `Student.year` (1–4) is sufficient.
- **AcademicSession is the system-wide "clock."** A single document holding the current `academicYear` + `semester`, updated twice a year by Admin (`updateAcademicSession`, upsert). Every teaching-assignment check compares against this live document — not a hardcoded/env-var value — so no server restart is needed when a new semester starts.
- **Students can browse lower-year content too.** Subject visibility is `Subject.year ≤ Student.year`, not an exact match.
- **Comments are Q&A, not open discussion.** Only the faculty member who personally uploaded a given lecture (`lecture.uploadedBy`) can reply to comments on it — checked by comparing ObjectIds via `.toString()`. Replies are embedded inside `Comment.replies[]`, not a separate collection, since they don't need independent querying.
- **Comments are asynchronous, not live chat.** A persistent discussion section below the video player — not a YouTube-live-style simultaneous chat. No timestamp-in-video field; no WebSocket/real-time layer.
- **Lectures persist even if faculty leave.** (Open item: add `isActive` Boolean to `Faculty` for soft-delete instead of hard-deleting accounts, so historical "uploaded by" labels don't break.)
- **Video quality switching** is handled via Cloudinary URL transformations (720p/480p/360p/data saver), not separately stored files.

---

## 5. Backend File Structure (33 files)

```
Backend/
├── controllers/       (7)  student, faculty, admin, subject, topic, lecture, comment
├── middlewares/        (4)  authMiddleware, roleMiddleware, teachingAssignmentMiddleware, errorHandler
├── models/              (9)  Admin, Faculty, Student, Subject, Topic, Lecture, Comment,
│                              TeachingAssignment, AcademicSession
├── routes/               (7)  studentRoutes, facultyRoutes, adminRoutes, subjectRoutes,
│                              topicRoutes, lectureRoutes, commentRoutes
├── utils/                 (4)  ApiError, ApiResponse, asyncHandler, cloudinary
├── app.js
├── index.js
└── .env
```

**Why TeachingAssignment/AcademicSession have no dedicated controller file:** they're not resources anyone browses independently — all their logic lives inside `adminController.js`, since Admin is the only role that ever touches them.

### Middleware chain (request lifecycle)

1. **`authMiddleware` (`verifyJWT`)** — verifies the JWT, looks up the correct model (`Student`/`Faculty`/`Admin`) based on the token's `role` claim, attaches the full document (minus password) to `req.user`.
2. **`roleMiddleware` (`authorize(...roles)`)** — factory function; checks `req.user.role` against an allow-list. E.g. `authorize("admin")`, `authorize("faculty")`.
3. **`teachingAssignmentMiddleware` (`checkTeachingAssignment`)** — for topic/lecture *creation* routes only. Derives the `subjectId` (directly from the body, or via a `Topic` lookup if only `topicId` was given), fetches the current `AcademicSession`, and confirms a `TeachingAssignment` exists for `(facultyId, subjectId, academicYear, semester)`. Rejects with `403` if the faculty member isn't currently assigned to that subject.
4. **`errorHandler`** — 4-argument Express error middleware, registered **last** in `app.js`. Catches every thrown `ApiError` (and unexpected errors) and returns a consistent JSON shape: `{ success, message, errors }`.

All controllers are wrapped in `asyncHandler`, which forwards thrown/rejected errors to `next(err)` so `errorHandler` catches them centrally — no repeated try/catch boilerplate per controller.

### Route → middleware mapping (representative)

```
POST   /student/signup                                          (public)
POST   /student/login                                           (public)
GET    /student/profile          verifyJWT

POST   /faculty/login                                            (public)
GET    /faculty/profile          verifyJWT

POST   /admin/login                                               (public)
POST   /admin/faculty            verifyJWT, authorize("admin")
POST   /admin/assign             verifyJWT, authorize("admin")
PUT    /admin/promote            verifyJWT, authorize("admin")
PUT    /admin/update              verifyJWT, authorize("admin")     (sets AcademicSession)
GET    /admin/currentSession     verifyJWT, authorize("admin")

GET    /subject                  verifyJWT
POST   /subject                  verifyJWT, authorize("admin")

GET    /topic/:subjectId         verifyJWT
POST   /topic                    verifyJWT, authorize("faculty"), checkTeachingAssignment

GET    /lecture/topic/:topicId   verifyJWT
GET    /lecture/:lectureId       verifyJWT
POST   /lecture/upload           verifyJWT, authorize("faculty"), checkTeachingAssignment

GET    /comment/getComment       verifyJWT
POST   /comment/postComment      verifyJWT, authorize("student")
POST   /comment/postReply        verifyJWT, authorize("faculty")
```

All 7 routers are mounted under distinct top-level prefixes in `app.js` (`/student`, `/faculty`, `/admin`, `/subject`, `/topic`, `/lecture`, `/comment`), so identical relative paths across routers (e.g. `/profile`) never collide.

---

## 6. Core Flows

### Faculty onboarding & assignment (no self-signup)
1. Admin (seeded manually in Atlas) logs in.
2. Admin calls `createFaculty` → new Faculty account exists.
3. Admin creates a `Subject` (curriculum-level, admin-only — subjects represent official courses, not something a teacher can invent).
4. Admin calls `assignSubject` → creates a `TeachingAssignment(facultyId, subjectId, academicYear, semester)`.
5. Faculty logs in; `getFacultyProfile` returns their profile *and* their current `TeachingAssignment`s (populated with subject info).

### Content creation gate
1. Faculty attempts `POST /topic` or `POST /lecture/upload`.
2. `checkTeachingAssignment` derives the subject, pulls the live `AcademicSession`, and confirms a matching `TeachingAssignment` exists.
3. Only if the assignment matches the *current* session does the request reach the controller.
4. **Prerequisite:** `AcademicSession` must be seeded via `updateAcademicSession` at least once — otherwise every upload attempt is rejected with "session not configured."

### Video upload
1. Faculty sends `multipart/form-data` to `/lecture/upload` with `topicId`, `title`, `description`, and a `video` file.
2. `express-fileupload` writes it to a temp path.
3. `uploadOnCloudinary(tempFilePath)` uploads to Cloudinary, deletes the local temp file afterward (success or failure).
4. `thumbnailUrl` is derived from the returned video URL via extension swap; `duration` comes directly from Cloudinary's response.
5. `Lecture` document created with `uploadedBy = req.user._id`.

### Student browsing
1. Student logs in (email or MIS + password).
2. `GET /subject` — filtered server-side by `req.user.department` and `Subject.year ≤ req.user.year` (never trusts client-supplied department/year).
3. `GET /topic/:subjectId` → sorted by `order`.
4. `GET /lecture/topic/:topicId` → each lecture's `uploadedBy` populated with the faculty's name for display.

### Comment / Q&A
1. Student posts a comment on a lecture (`studentId` taken from `req.user`, never trusted from the body).
2. Any faculty member *except* the one who uploaded that lecture is blocked from replying (`403`) — checked via `lecture.uploadedBy.toString() === req.user._id.toString()`.
3. Valid reply is pushed into `comment.replies[]` and saved.

---

## 7. Security Notes

- Every mutating/private route requires a valid JWT (`verifyJWT`), plus role checks (`authorize`) where the action is role-restricted.
- Server-derived identity fields (`studentId`, `uploadedBy`, `facultyId` on replies) are always taken from `req.user`, never from client-supplied request bodies — prevents impersonation.
- ObjectId comparisons use `.toString()` on both sides (MongoDB ObjectIds are objects, not primitives — direct `!==` comparison is a common, easy-to-miss bug).
- Duplicate-prevention checks (e.g. subject code, teaching assignment combination) use `findOne` (returns `null`/document), never `find` (always returns an array, and an empty array is truthy in JS — a repeated bug caught during development).
- All relative imports require explicit `.js` extensions (Node ESM requirement) — a recurring source of `ERR_MODULE_NOT_FOUND` during development.

---

## 8. Known Open Items

- `Faculty.isActive` soft-delete flag — not yet added.
- Whether `mis` stays as an unverified free-typed field on student signup, now that the MIS allowlist is shelved.
- Whether `GET /subject` should explicitly require `authorize("student")` (currently any authenticated role can call it, but only a Student document has the `department`/`year` fields the handler expects — faculty/admin tokens currently get a slightly confusing `400` instead of a clean `403`).
- Deferred to v2: WatchHistory.
- Flagged as possible low-effort/high-value future additions: view count, playback speed control, search, faculty-pinned notes.

---

## 9. Frontend (planned, not yet built)

Likely React, driven entirely by this API:
- JWT stored client-side after login; attached to every request.
- Role read from the decoded token (or the `/profile` response) drives which UI a user sees — student browse view vs. faculty upload view vs. admin management view.
- Protected routes on the client mirror `authorize()` server-side — client-side checks are a UX convenience only; the backend middleware remains the actual security boundary.
- Video quality switching implemented client-side via Cloudinary URL transformation parameters against the stored `videoUrl`.