# 🎓 AcadPro Frontend Architecture & Design Specification

---

## 🔐 1. User Roles & Authentication Flow

AcadPro operates on **3 Role-Based Portals**:
1. **Admin** (`role: "admin"`) – Manages faculty, course assignments, sessions, and student progression.
2. **Faculty** (`role: "faculty"`) – Creates topics, uploads video lectures, and replies to student comments/Q&A.
3. **Student** (`role: "student"`) – Enrolls/browses assigned department/year subjects, watches video lectures, and posts comments.

### 🔑 Authentication Screens
* **Unified Login Page / Tabbed Login Modal:**
  * Option to switch between **Student Login**, **Faculty Login**, and **Admin Login**.
  * **Fields:**
    * *Student Login:* `mis` or `email`, `password`.
    * *Faculty Login:* `email`, `password`.
    * *Admin Login:* `username`, `password`.
* **Student Registration / Signup Page:**
  * **Fields:** `mis` (Unique ID), `name`, `email`, `password`, `department` (e.g., Computer Science, Mechanical), `year` (1, 2, 3, 4).
* **JWT & Session Management:**
  * Stores Access Tokens (`accessToken`) in cookies / localStorage.
  * Role authorization guards to restrict page access based on user role.

---

## 📊 2. Dashboards & Page Hierarchy

### 🛡️ A. Admin Dashboard (`/admin/dashboard`)
* **Header / Navigation:** Academic Session Badge (e.g., "Current Session: 2025-2026 - Fall"), Admin Profile dropdown, Quick Action Buttons.
* **Key Features & Management Tabs:**
  1. **Academic Session Manager:**
     * View current active session.
     * Modal/Form to **Update Academic Session** (Inputs: `year`, `semester`).
  2. **Faculty Management:**
     * Form/Modal to **Create New Faculty Account** (Inputs: `name`, `email`, `password`).
     * List of registered faculty members.
  3. **Teaching Assignment Manager:**
     * Form/Modal to **Assign Subject to Faculty** (Dropdowns: Select Faculty, Select Subject, Select Academic Session).
  4. **Student Year Promotion:**
     * Bulk Action Card/Button: **"Promote Students to Next Year"** (Triggers batch update in DB for year progression).
  5. **Subject Management:**
     * Form/Modal to **Create Subject** (Inputs: `name`, `code`, `department`, `year`).
     * Data table of subjects filtered by Department and Year.

---

### 👨‍🏫 B. Faculty Dashboard (`/faculty/dashboard`)
* **Header / Overview:** Faculty Profile summary, list of assigned subjects for the active session.
* **Key Pages & Views:**
  1. **Assigned Subjects Grid:**
     * Cards for each subject assigned via `TeachingAssignment`. Shows Subject Name, Code, Department, and Year.
  2. **Topic & Curriculum Manager (`/faculty/subject/:subjectId`):**
     * Accordion view of topics under the selected subject.
     * Modal to **Create New Topic** (Inputs: `title`, `description`, `order`).
  3. **Lecture Upload Portal (`/faculty/topic/:topicId/upload`):**
     * Form to **Upload Lecture Video & Details**:
       * Fields: `title`, `description`, `video` (file input for Cloudinary upload), `thumbnail` (image upload), `duration` (in seconds/mins).
       * Upload progress bar indicator.
  4. **Q&A & Comment Moderation Center:**
     * View all student comments on uploaded lectures.
     * **Reply Drawer/Modal:** Faculty can submit official replies to student comments (`text`, `facultyId`).

---

### 👨‍🎓 C. Student Portal & Dashboard (`/student/dashboard`)
* **Header / Top Bar:** Search bar (for lectures/topics), Department & Year indicator badges, Student Profile avatar.
* **Key Pages & Views:**
  1. **My Courses / Subjects Grid (`/student/dashboard`):**
     * Filters subjects automatically matching the student's `department` and `year`.
     * Cards display: Subject Title, Code, Total Topics, Progress Indicator.
  2. **Subject Syllabus & Topics Page (`/student/subject/:subjectId`):**
     * Topic list with expandable list of video lectures.
     * Meta details: Lecturer Name, Duration, Upload Date.
  3. **Interactive Video Player Page (`/student/lecture/:lectureId`):**
     * **Video Player:** HTML5 Custom Video Player / Cloudinary Video Embed player.
     * **Lecture Meta:** Title, Description, Instructor Details, Topic Breadcrumbs.
     * **Discussion / Q&A Section:**
       * Comment list sorted chronologically.
       * Form to **Post New Comment** (`text`).
       * View **Faculty Replies** highlighted with an official badge.

---

## 🎨 3. UI/UX & Design Recommendations for Stitch

* **Theme & Style:** Modern Dark/Light Glassmorphism with deep navy/indigo backgrounds, vibrant accent colors (Cyan `#00F2FE` or Violet `#7F00FF` for primary CTAs).
* **Typography:** Clean sans-serif fonts such as *Inter*, *Plus Jakarta Sans*, or *Outfit*.
* **Components to Design in Stitch:**
  * **Sidebar / Navbar Component:** Dynamic links based on user role (`admin`, `faculty`, `student`).
  * **Subject/Course Card:** Includes gradient headers, progress badges, subject code tag, and instructor avatar.
  * **Video Player Workspace:** Theater mode layout with video player on left (70% width) and interactive Q&A tabbed panel on right (30% width).
  * **Data Tables / Modals:** Sleek modals for Admin actions (Assign Faculty, Promote Batch) with confirmation toasts.
  * **Upload Area Dropzone:** Drag-and-drop file upload container for lecture videos and thumbnails.

---

## 🔌 4. Complete API Data Integration Matrix

| Module | Route / Endpoint | HTTP Method | Protected | Role Allowed | Frontend Trigger / Component |
|---|---|---|---|---|---|
| **Admin** | `/api/v1/admin/login` | `POST` | No | Public | Admin Login Form |
| **Admin** | `/api/v1/admin/faculty` | `POST` | Yes | `admin` | Create Faculty Form/Modal |
| **Admin** | `/api/v1/admin/assign` | `POST` | Yes | `admin` | Assign Subject to Faculty Form |
| **Admin** | `/api/v1/admin/promote` | `PUT` | Yes | `admin` | Promote Year Button |
| **Admin** | `/api/v1/admin/update` | `POST` | Yes | `admin` | Update Academic Session Form |
| **Admin** | `/api/v1/admin/currentSession` | `GET` | Yes | `admin` | Header / Session Status Badge |
| **Faculty**| `/api/v1/faculty/login` | `POST` | No | Public | Faculty Login Form |
| **Faculty**| `/api/v1/faculty/profile` | `GET` | Yes | `faculty` | Faculty Dashboard Header |
| **Student**| `/api/v1/student/signup` | `POST` | No | Public | Student Registration Form |
| **Student**| `/api/v1/student/login` | `POST` | No | Public | Student Login Form |
| **Student**| `/api/v1/student/profile` | `GET` | Yes | `student` | Student Dashboard / Profile Header |
| **Subject**| `/api/v1/subject` | `GET` | Yes | Any Auth | Subject Cards List Grid |
| **Subject**| `/api/v1/subject` | `POST` | Yes | `admin` | Create Subject Form |
| **Topic**  | `/api/v1/topic/:subjectId` | `GET` | Yes | Any Auth | Subject Details / Topics List |
| **Topic**  | `/api/v1/topic` | `POST` | Yes | `faculty` | Create Topic Modal (validated by `checkTeachingAssignment`) |
| **Lecture**| `/api/v1/lecture` | `POST` / `GET` | Yes | `faculty` / `student` | Video Upload Form & Video Player View |

---

## ⚡ 5. State Management & Prerequisites Checklist

1. **Global Auth State:** Context / Redux store holding `user` object (`id`, `name`, `email`, `role`, `department`, `year`) and `isAuthenticated`.
2. **File Upload Handlers:** Multipart Form Data (`FormData`) handler for Cloudinary uploads (video + thumbnail).
3. **Route Guards:** High-level router wrappers (e.g., `<ProtectedRoute allowedRoles={['admin']} />`).
4. **Toast Notifications:** Alert users on successful actions (e.g., "Faculty assigned successfully", "Lecture uploaded", "Year promoted").
=======
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

**Not built (deliberately shelved):**
- `ValidStudent` (MIS allowlist) — no allowlist data currently available; replaced with a simpler college-email-domain check (`@iiitp.ac.in`) on signup.
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
>>>>>>> 566071c0153f01fbcc50298f11ecd7ace885d762
