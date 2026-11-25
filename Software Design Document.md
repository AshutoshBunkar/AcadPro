# Software Design Document: AcadeX

**College Lecture Archive and Academic Resource Management Platform**  
**Document Version:** 2.0.0 (Production Verified) • **Date:** October 2026  
**Configured Academic Session:** AY 2026–2027 • **Active Term Semesters:** 1st, 3rd, 5th, 7th

---

## 1. Introduction

### 1.1 Purpose
This Software Design Document (SDD) specifies the complete software architecture, system modules, data models, functional requirements, and technical interfaces for **AcadeX**, an institutional college lecture archive and digital curriculum management platform. 

This document serves as the authoritative technical reference for software engineers, academic administrators, system architects, and project evaluators maintaining and extending the platform.

### 1.2 Project Scope
AcadeX provides a centralized, authenticated digital learning platform designed to capture and organize academic instruction along real-world institutional structures. It enables college students to review missed lectures, revisit complex lecture topics, and participate in instructor-moderated academic discussions.

The system encompasses three distinct, role-governed user portals:
- **Student Portal:** Academic discovery and course enrollment tracking, hierarchical course navigation (Semester → Subject → Topic → Lecture), video playback with multi-bitrate resolution selection, and lecture-specific question/comment submission.
- **Faculty Portal:** Course teaching allocations management across active terms, topic curriculum authoring, video lecture studio uploads with automated Cloudinary chunked ingestion, question-and-answer moderation, student course roster viewing with CSV export, and elective/course addition proposals via the subject-request workflow.
- **Admin Central Command:** Master administrative oversight, including academic session configuration (configured for AY 2026–2027 Autumn Term), semester lifecycle management, canonical course catalog administration, faculty account creation, teaching allocations, student enrollment/promotion management, faculty course request approval/rejection, and immutable security audit log monitoring.

### 1.3 Problem Definition
In traditional college environments, students frequently miss portions of lectures due to illness, schedule conflicts, or cognitive overload during fast-paced lectures. Ad-hoc solutions (such as unstructured cloud drives or unlisted YouTube links) lead to fragmented materials, broken access control, lack of curriculum alignment, and zero connection between video materials, official course rosters, and instructor Q&A.

AcadeX solves these issues by structuring all recordings into a formal academic hierarchy tied to the active academic year, semester, department, and course code, with strictly enforced role-based access control.

### 1.4 Objectives
1. Provide a reliable, searchable archive of recorded lectures structured strictly by **Subject → Topic → Lecture**.
2. Restrict access to authenticated institutional users with verifiable college email gating (`@iiitp.ac.in`).
3. Maintain data integrity across active academic sessions (`2026–2027`) and concurrent active semesters (`1st, 3rd, 5th, 7th`) without ambiguous year classifications.
4. Support transactional course addition proposals from faculty with administrative approval and automatic student enrollment.
5. Provide high-quality adaptive video delivery with automated thumbnail generation and secure cloud media management.

### 1.5 Intended Audience
- **Software Engineers & Maintainers:** Implementation details, API signatures, schema definitions, and dependency structures.
- **System Architects & Evaluators:** Architectural patterns, security boundaries, SDLC model, and database normalization.
- **Academic Administrators:** Workflows for curriculum management, semester updates, and student progression.

### 1.6 Definitions, Acronyms, and Abbreviations

| Term / Acronym | Definition |
|---|---|
| **ACID** | Atomicity, Consistency, Isolation, Durability (database transaction properties) |
| **API** | Application Programming Interface |
| **AY** | Academic Year (e.g., `2026-2027`) |
| **CDN** | Content Delivery Network (Cloudinary) |
| **HMR** | Hot Module Replacement (Vite feature) |
| **JWT** | JSON Web Token (RFC 7519) |
| **MIS** | Management Information System Number (Unique Student Identifier at IIIT Pune) |
| **ODM** | Object Data Modeling (Mongoose) |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SDD** | Software Design Document |
| **SPA** | Single Page Application (React) |

---

## 2. Overall System Description

### 2.1 Product Perspective
AcadeX operates as an autonomous web application deployed in a client-server architecture. It integrates with **MongoDB Atlas** for document persistence and **Cloudinary** for video transcoding, thumbnail extraction, and adaptive content delivery.

```
┌──────────────────┐         HTTPS / REST          ┌──────────────────┐
│   React 19 SPA   │ ◄───────────────────────────► │  Node / Express  │
│  (Vite Bundler)  │                               │    REST API      │
└────────┬─────────┘                               └────────┬─────────┘
         │                                                  │
         │ Direct Video Stream                              ├─────────► MongoDB Atlas
         ▼                                                  │           (14 Collections)
┌──────────────────┐                                        │
│  Cloudinary CDN  │ ◄──────────────────────────────────────┘
│ (HLS / MP4 Media)│        Chunked Video Uploads (API)
└──────────────────┘
```

### 2.2 Major System Capabilities
1. **Multi-Role Authentication:** Unified login interface supporting Student, Faculty, and Admin authentication with role-separated JWT payload claims.
2. **Academic Term Management:** Flexible session configuration allowing multiple concurrent semesters (Semesters 1, 3, 5, 7 in AY 2026–2027) without conflating semester numbers with study year levels.
3. **Faculty Subject Request Workflow:** Faculty can submit formal course offering requests to the administration. Upon atomic approval by an admin, the system automatically creates the canonical subject, activates the teaching assignment, and enrolls all eligible students.
4. **Course Roster Management:** Faculty can view active enrolled students per course offering and export rosters directly to CSV format.
5. **Video Lecture Studio:** Faculty upload video files up to 500MB via chunked streaming to Cloudinary with automatic cleanup of server temporary files.
6. **Curriculum Navigation:** Students navigate subjects, topics, and lectures with enrollment validation and read-only preservation of archived past semesters.
7. **Threaded Q&A Moderation:** Students can submit lecture-specific questions in active courses; only the instructor who taught that specific lecture can post official instructor replies.
8. **In-App Notification Center:** Real-time alert polling (30-second interval) notifying users of course request submissions, approvals, rejections, and curriculum changes.
9. **Security Audit Trail:** Comprehensive recording of system, curriculum, session, and authentication events with actor, IP, severity, and status tracking.

### 2.3 User Classes and Characteristics
- **Students (User):** Self-registered via verified `@iiitp.ac.in` email and MIS. Enrolled in semester courses matching their department and academic standing. Have read access to course lectures and interactive access to Q&A in active semesters.
- **Faculty (Instructor):** Accounts created exclusively by administrators. Assigned to one or more course offerings per academic term. Empowered to create curriculum topics, upload lectures, moderate Q&A, request new courses, and export rosters.
- **Administrators (Admin):** Privileged system controllers seeded securely. Manage academic sessions, semesters, faculty accounts, course catalog entries, teaching allocations, subject request reviews, student promotions, and security audit logs.

### 2.4 Operating Environment
- **Server Runtime:** Node.js v18.0.0+ (Tested on Node.js v22.16.0 LTS), Windows / Linux / macOS.
- **Client Execution:** Modern evergreen web browsers (Chromium 110+, Firefox 110+, Safari 16+, Edge).
- **Database:** MongoDB Atlas 6.0+ replica set with multi-document transaction support.
- **Cloud Media:** Cloudinary Programmable Media API with chunked large-upload support.

### 2.5 System Constraints
- **File Size Limit:** Video uploads are capped at 500MB per file (`express-fileupload` configuration).
- **Email Gating:** Student registration is constrained to the institutional `@iiitp.ac.in` domain.
- **Transaction Requirement:** Database deployment must support replica set transactions (Mongoose `session.startTransaction()`). Standalone non-replica MongoDB instances cannot run course approval or promotion workflows.

### 2.6 Assumptions and Dependencies
- MongoDB Atlas cluster remains accessible over TLS.
- Cloudinary credentials have active quota for video storage and bandwidth delivery.
- Institutional curriculum maintains two semesters per undergraduate year (Year 1: S1/S2, Year 2: S3/S4, Year 3: S5/S6, Year 4: S7/S8).

---

## 3. Functional Requirements

### 3.1 Authentication & Role-Based Access Control (AUTH)

- **`FR-01` [Student Registration]:** The system shall allow students to self-register only with a valid `@iiitp.ac.in` email, full name, unique MIS number, password (minimum 6 characters), department (CSE/ECE), and starting year.
- **`FR-02` [Student Login]:** The system shall authenticate students using either their registered email or unique MIS number along with their password, returning a signed 7-day JWT.
- **`FR-03` [Faculty Login]:** The system shall authenticate faculty members using their institutional email and password. Self-registration for faculty shall be disabled.
- **`FR-04` [Admin Login]:** The system shall authenticate administrators using email and password. Self-registration and public creation of admin accounts shall be prohibited.
- **`FR-05` [Token Verification]:** Protected API endpoints shall reject any request lacking a valid `Bearer <token>` HTTP header with HTTP 401 Unauthorized.
- **`FR-06` [Role Enforcement]:** The system shall enforce endpoint authorization based on JWT role claims: `student`, `faculty`, or `admin`, rejecting unauthorized roles with HTTP 403 Forbidden.

### 3.2 Academic Configuration & Session Management (ACAD)

- **`FR-07` [Session Enforcement]:** The system shall enforce the currently configured academic year `2026–2027` and Autumn Term active semesters `1, 3, 5, 7`.
- **`FR-08` [Semester Labels]:** The user interface shall display semester options and headers using `1st Semester`, `3rd Semester`, `5th Semester`, and `7th Semester` without embedding redundant year numbers into semester selection fields.
- **`FR-09` [Session Update]:** Administrators shall be able to update the current college-wide academic session term (`ODD` or `EVEN`) and active semesters.
- **`FR-10` [Semester Lifecycle]:** Administrators shall be able to create, update, and manage semester blocks with status transitions between `pending_enrollment`, `active`, and `archived`.

### 3.3 Subject Request Workflow (REQ)

- **`FR-11` [Faculty Course Request Submission]:** Faculty shall be able to submit a course addition request specifying course code, subject title, department, target semester (1–8), section, and credit weighting.
- **`FR-12` [Duplicate Request Rejection]:** The system shall reject a course addition request with HTTP 409 Conflict if the faculty is already assigned to that course offering or if a pending request for the same code, academic year, semester, and section already exists.
- **`FR-13` [Admin Notification of Request]:** Upon submission of a course addition request, the system shall automatically create an in-app notification for all active administrators.
- **`FR-14` [Admin Request Review]:** Administrators shall be able to view all pending and reviewed course requests with faculty details and submission timestamps.
- **`FR-15` [Atomic Request Approval]:** When an administrator approves a course request, the system shall execute an atomic database transaction that:
  1. Resolves the canonical `Subject` (reuses existing by code or creates a new entry).
  2. Ensures the target `Semester` document is active.
  3. Creates or reactivates a `TeachingAssignment` for the requesting faculty.
  4. Automatically enrolls all eligible students matching department and current semester into `StudentEnrollment`.
  5. Updates `SubjectRequest` status to `approved` with admin remarks, reviewer ID, and timestamps.
  6. Dispatches an approval notification to the faculty member.
- **`FR-16` [Request Rejection]:** When an administrator rejects a course request, the system shall record admin remarks, update the request status to `rejected`, and send an alert notification to the requesting faculty member without modifying the catalog or teaching assignments.
- **`FR-17` [Approval Idempotency]:** The system shall reject repeated approval attempts on an already approved request with HTTP 400 Bad Request.

### 3.4 Curriculum & Teaching Allocations (CURR)

- **`FR-18` [Subject Catalog Management]:** Administrators shall be able to create subjects with unique course codes, department associations, and allowed semester arrays.
- **`FR-19` [Course Code Uniqueness]:** The system shall enforce global uniqueness on subject course codes, rejecting duplicate codes with HTTP 409 Conflict.
- **`FR-20` [Teaching Allocations]:** Administrators shall be able to allocate faculty members to subjects for a specific academic year, semester, and section.
- **`FR-21` [Faculty Course Dashboard]:** The faculty dashboard shall display all active course offerings assigned to the logged-in faculty member for the active academic session, including total enrolled student counts.
- **`FR-22` [Course Roster & CSV Export]:** Faculty shall be able to inspect the student enrollment roster for any of their assigned courses and download the roster as a standard CSV file.

### 3.5 Student Enrollment & Progression (STU)

- **`FR-23` [Student Course Discovery]:** The student dashboard shall display all actively enrolled courses for the student's current semester in AY 2026–2027.
- **`FR-24` [Past Semester Archive]:** The student dashboard shall group past courses under an archived tab, displaying them with a "Read-Only" indicator.
- **`FR-25` [Student Year Promotion]:** Administrators shall be able to trigger student promotion, advancing students to the next academic year and semester while archiving their previous course enrollments with status `completed`.

### 3.6 Lecture Studio & Video Streaming (LECT)

- **`FR-26` [Topic Creation Gating]:** Faculty shall be able to create topics only for subjects they are actively assigned to teach in the active session (`checkTeachingAssignment`).
- **`FR-27` [Lecture Upload]:** Faculty shall be able to upload video lectures with title, description, and video file (up to 500MB) to assigned topics.
- **`FR-28` [Cloudinary Ingestion]:** The backend shall upload video files to Cloudinary using chunked large-file streaming, automatically generate a video poster thumbnail, and delete the temporary server file upon completion.
- **`FR-29` [Adaptive Video Player]:** The lecture video player shall allow authenticated users to switch playback quality dynamically (360p, 480p, 720p, 1080p, auto) while preserving playback position.
- **`FR-30` [Lecture Deletion & Cloud Cleanup]:** Faculty (and admins) shall be able to delete uploaded lectures; the system shall remove the database record, delete the video from Cloudinary (`destroy`), and cascade-delete all associated comments.

### 3.7 Discussion & Q&A (DISC)

- **`FR-31` [Student Comment Submission]:** Enrolled students shall be able to post academic questions on lectures in active semester courses.
- **`FR-32` [Archived Course Q&A Lock]:** The system shall reject comments posted on lectures belonging to past/archived semesters with HTTP 403 Forbidden.
- **`FR-33` [Faculty Official Replies]:** Only the faculty member who uploaded the specific lecture shall be permitted to post replies to comments on that lecture.

### 3.8 Notification & Security Audit (NOTIF / AUD)

- **`FR-34` [Notification Retrieval]:** Authenticated users shall receive their uncleared in-app notifications and unread counters via polling.
- **`FR-35` [Notification Management]:** Users shall be able to mark notifications as read or clear/dismiss them individually or in bulk.
- **`FR-36` [Audit Trail Logging]:** The system shall automatically record critical security, curriculum, and session events in the `AuditLog` collection.

---

## 4. Non-Functional Requirements

### 4.1 Security Requirements
- **`NFR-SEC-01` [Password Hashing]:** All user passwords shall be hashed using `bcrypt` with a salt round factor of 10 prior to storage.
- **`NFR-SEC-02` [Stateless Tokens]:** JWT tokens shall be signed with HMAC SHA-256 using a high-entropy secret (`JWT_SECRET`) and expire after 7 days.
- **`NFR-SEC-03` [Identity Isolation]:** User operations must bind strictly to the verified token identity (`req.user._id`); user IDs supplied in request bodies shall never override verified credentials.
- **`NFR-SEC-04` [CORS Enforcement]:** The backend shall configure CORS to permit requests exclusively from authorized client origins.

### 4.2 Performance & Responsiveness
- **`NFR-PERF-01` [API Latency]:** Standard JSON API endpoints (profiles, catalog listings, notifications) shall respond within 300ms under standard local network conditions.
- **`NFR-PERF-02` [Chunked Uploads]:** Video uploads up to 500MB shall be streamed in 6MB chunks to prevent memory exhaustion and buffer bloat.
- **`NFR-PERF-03` [Query Indexing]:** All frequent foreign key references and compound lookup patterns (`studentId + subjectId + AY + semester`) must be backed by B-tree indexes to maintain sub-50ms query times.

### 4.3 Reliability & Data Integrity
- **`NFR-REL-01` [Atomic State Transitions]:** Multi-collection modifications (such as subject request approvals and student promotions) must execute inside Mongoose transactions to prevent orphaned records.
- **`NFR-REL-02` [Temp File Cleanup]:** The backend must clean up local temporary upload files under both successful upload and error conditions.
- **`NFR-REL-03` [Duplicate Prevention]:** Database compound unique indexes must enforce course code uniqueness, unique student enrollments per term, and single teaching assignments per offering.

### 4.4 Usability & Aesthetics
- **`NFR-USA-01` [Visual Standard]:** The UI must implement a curated glassmorphic dark theme (`#08090D`, `#11141B`, `#191E28`, cyan `#75D7FF`, pink `#FF3D9A`) with responsive breakpoints for desktop and mobile devices.
- **`NFR-USA-02` [Feedback & Loading States]:** All asynchronous operations (form submissions, file uploads, table refreshes) must provide visual feedback (spinners, skeleton loaders, confirmation modals, or toast notifications).

### 4.5 Maintainability & Standards
- **`NFR-MNT-01` [Modular Codebase]:** Backend code must use standard ES Modules (`import`/`export`) with explicit `.js` extensions.
- **`NFR-MNT-02` [Error Architecture]:** All controller errors must be wrapped via `asyncHandler` and thrown as instances of `ApiError` with explicit HTTP status codes.

---

## 5. System Architecture & Communication Model

AcadeX follows a **3-tier decoupled architectural pattern**:

```
[ PRESENTATION TIER: React 19 Single Page App ]
       │
       │ HTTP / JSON (Axios, TanStack Query)
       │ Headers: Authorization: Bearer <JWT>
       ▼
[ APPLICATION TIER: Node.js Express 5 REST API ]
       │
       ├─ Middlewares: verifyJWT, authorize, checkTeachingAssignment, errorHandler
       ├─ Business Logic: Controllers & Atomic Transactions
       │
       ├─────────────────────────────────┐
       │ Mongoose 9 ODM (TLS)            │ HTTPS Multipart / SDK
       ▼                                 ▼
[ PERSISTENCE TIER: MongoDB Atlas ]  [ MEDIA TIER: Cloudinary CDN ]
```

### 5.1 Communication Protocols & Payload Standards
- **Client-to-Backend:** RESTful HTTP requests with JSON payloads (`Content-Type: application/json`), except video uploads which use multipart form data (`multipart/form-data`).
- **Standardized Response Envelope:** All backend API endpoints return a unified response envelope via `ApiResponse`:
  ```json
  {
    "statusCode": 200,
    "data": { ... },
    "message": "Operation completed successfully",
    "success": true
  }
  ```
- **Standardized Error Envelope:** Errors are intercepted centrally by `errorHandler` and formatted via `ApiError`:
  ```json
  {
    "statusCode": 400,
    "data": null,
    "message": "Validation or business invariant error message",
    "success": false,
    "errors": []
  }
  ```

---

## 6. Detailed Module Design

```
                     ┌────────────────────────────────────────┐
                     │            ACADEX PLATFORM             │
                     └───────────────────┬────────────────────┘
                                         │
     ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
     │                   │                               │                   │
     ▼                   ▼                               ▼                   ▼
┌──────────────┐  ┌──────────────┐               ┌──────────────┐    ┌──────────────┐
│ Student Hub  │  │ Faculty Hub  │               │ Admin Hub    │    │ System & CDN │
├──────────────┤  ├──────────────┤               ├──────────────┤    ├──────────────┤
│ - Enrolled   │  │ - Assigned   │               │ - Session    │    │ - Cloudinary │
│   Courses    │  │   Offerings  │               │   Manager    │    │   Streaming  │
│ - Video      │  │ - Lecture    │               │ - Catalog    │    │ - In-App     │
│   Theater    │  │   Studio     │               │   Directory  │    │   Notifs     │
│ - Q&A Posts  │  │ - Roster CSV │               │ - Request    │    │ - Security   │
│ - Archive    │  │ - Course     │               │   Approval   │    │   Audit Logs │
│   Library    │  │   Requests   │               │ - Promotions │    │              │
└──────────────┘  └──────────────┘               └──────────────┘    └──────────────┘
```

### 6.1 Student Management Module
- **Responsibilities:** Student registration with email domain validation, MIS mapping, profile retrieval, active course discovery via `StudentEnrollment`, past semester grouping, and enrollment-gated access to topics and lectures.
- **Dependencies:** `Student`, `StudentEnrollment`, `Subject`, `Topic`, `Lecture`, `Semester`.

### 6.2 Faculty Management Module
- **Responsibilities:** Faculty authentication, profile management (bio, office location, office hours), teaching assignment lookup, course roster viewing, roster CSV export, lecture upload studio, and subject request submission.
- **Dependencies:** `Faculty`, `TeachingAssignment`, `SubjectRequest`, `StudentEnrollment`, `Subject`, `Lecture`.

### 6.3 Subject & Curriculum Management Module
- **Responsibilities:** Canonical course catalog maintenance, subject creation with unique course code validation, department and allowed semester configuration, topic ordering, and curriculum spaces.
- **Dependencies:** `Subject`, `Topic`, `Semester`.

### 6.4 Subject Request & Approval Module
- **Responsibilities:** Managing the end-to-end lifecycle of faculty course proposals. Faculty create requests; administrators approve or decline. On approval, handles atomic multi-collection creation (canonical subject, active offering, student enrollments, faculty notification).
- **Dependencies:** `SubjectRequest`, `Subject`, `Semester`, `TeachingAssignment`, `StudentEnrollment`, `Notification`, `AuditLog`.

### 6.5 Lecture Studio & Media Module
- **Responsibilities:** Validating faculty teaching assignments, chunked streaming video upload to Cloudinary, automatic video thumbnail derivation, video deletion with Cloudinary destroy, and multi-bitrate delivery.
- **Dependencies:** `Lecture`, `Topic`, `TeachingAssignment`, Cloudinary SDK, `express-fileupload`.

### 6.6 Discussion & Q&A Module
- **Responsibilities:** Threaded question-and-answer interactions attached to video lectures. Enforces active semester write-permissions (blocking comments on archived courses) and restricts replies exclusively to the uploading faculty member.
- **Dependencies:** `Comment`, `Lecture`, `StudentEnrollment`, `AcademicSession`.

### 6.7 Notification & Audit Module
- **Responsibilities:** User notification dispatch, unread polling, status transitions (read/dismissed), and immutable audit trail logging for institutional security monitoring.
- **Dependencies:** `Notification`, `AuditLog`.

---

## 7. Database Design & Schema Specifications

The AcadeX database schema consists of **14 Mongoose models** persisted in MongoDB Atlas:

### 7.1 Schema Definitions

#### 1. `Admin` Collection
Stores administrator identities and master credentials.
- `_id`: ObjectId (Primary Key)
- `email`: String (Required, Unique, Lowercase)
- `password`: String (Required, bcrypt hashed via pre-save hook)
- `name`: String (Default: "Sarah Connor")
- `designation`: String (Default: "Lead Infrastructure Architect")
- `phone`: String
- `accessLevel`: String (Default: "Super Admin")
- `adminCode`: String (Default: "ADM-90210")
- `avatar`: String (URL)
- `allowedDomains`: [String] (Default: `["acadex.edu", "iiitp.ac.in", "faculty.acadex.edu"]`)
- `timestamps`: `createdAt`, `updatedAt`

#### 2. `Faculty` Collection
Stores faculty profiles and credentials.
- `_id`: ObjectId (Primary Key)
- `email`: String (Required, Unique, Lowercase)
- `password`: String (Required, bcrypt hashed via pre-save hook)
- `name`: String (Required)
- `designation`: String (e.g. "Assistant Professor", "Professor & HOD")
- `department`: String (e.g. "CSE", "ECE")
- `specialization`: String (e.g. "Machine Learning", "VLSI Design")
- `phone`: String
- `officeLocation`: String (e.g. "Turing Hall 404")
- `officeHours`: String (e.g. "Mon/Wed 2:00 PM - 4:00 PM")
- `avatar`: String (URL)
- `timestamps`: `createdAt`, `updatedAt`

#### 3. `Student` Collection
Stores student identities, credentials, and academic standing.
- `_id`: ObjectId (Primary Key)
- `mis`: String (Required, Unique, e.g. "112415033")
- `name`: String (Required)
- `email`: String (Required, Unique, domain-restricted to `@iiitp.ac.in`)
- `password`: String (Required, bcrypt hashed during signup)
- `department`: String (Required, e.g. "CSE", "ECE")
- `year`: Number (Required, 1 to 4)
- `currentSemester`: Number (Computed default: `(year - 1) * 2 + 1`, 1 to 8)
- `timestamps`: `createdAt`, `updatedAt`

#### 4. `AcademicSession` Collection
Single-document singleton governing college-wide active academic parameters.
- `_id`: ObjectId (Primary Key)
- `academicYear`: String (Required, e.g. `"2026-2027"`)
- `term`: String (Enum: `["ODD", "EVEN"]`, Default: `"ODD"`)
- `termName`: String (Default: `"Autumn / Odd Term"`)
- `activeSemesters`: [Number] (Default: `[1, 3, 5, 7]`)
- `semester`: Number (Legacy optional)
- `timestamps`: `createdAt`, `updatedAt`

#### 5. `Semester` Collection
Defines specific curriculum terms within an academic year.
- `_id`: ObjectId (Primary Key)
- `academicYear`: String (Required, e.g. `"2026-2027"`)
- `semesterNumber`: Number (Required, 1 to 8)
- `name`: String (e.g. `"AY 2026-2027 - 3rd Semester"`)
- `status`: String (Enum: `["pending_enrollment", "active", "archived", "completed"]`, Default: `"pending_enrollment"`)
- `isCurrent`: Boolean (Default: `false`)
- `startDate`: Date
- `endDate`: Date
- `description`: String
- **Indexes:** `{ academicYear: 1, semesterNumber: 1 }` (Unique)

#### 6. `Subject` Collection
The canonical master course catalog (syllabus definitions).
- `_id`: ObjectId (Primary Key)
- `name`: String (Required, e.g. "Machine Learning & Neural Networks")
- `code`: String (Required, Unique, Uppercase, e.g. "CS401")
- `department`: String (Required, e.g. "CSE", "ECE")
- `year`: Number (Required, 1 to 4)
- `allowedSemesters`: [Number] (Default based on year: `[(year-1)*2+1, (year-1)*2+2]`)
- **Indexes:** `{ code: 1 }` (Unique)

#### 7. `TeachingAssignment` Collection
Maps a faculty member to a specific course offering for an academic term.
- `_id`: ObjectId (Primary Key)
- `facultyId`: ObjectId (Required, ref: `Faculty`)
- `subjectId`: ObjectId (Required, ref: `Subject`)
- `semesterId`: ObjectId (Optional ref: `Semester`)
- `academicYear`: String (Required, e.g. `"2026-2027"`)
- `semester`: Number (Required, 1 to 8)
- `section`: String (Default: `"A"`)
- `department`: String
- `program`: String (Default: `"B.Tech"`)
- `status`: String (Enum: `["active", "archived"]`, Default: `"active"`)
- **Indexes:** `{ facultyId: 1, subjectId: 1, academicYear: 1, semester: 1, section: 1 }` (Unique)

#### 8. `StudentEnrollment` Collection
Tracks student registration in specific course offerings.
- `_id`: ObjectId (Primary Key)
- `studentId`: ObjectId (Required, ref: `Student`)
- `subjectId`: ObjectId (Required, ref: `Subject`)
- `semesterId`: ObjectId (ref: `Semester`)
- `teachingAssignmentId`: ObjectId (ref: `TeachingAssignment`)
- `facultyId`: ObjectId (ref: `Faculty`)
- `academicYear`: String (Required, e.g. `"2026-2027"`)
- `semester`: Number (Required, 1 to 8)
- `section`: String (Default: `"A"`)
- `department`: String
- `program`: String (Default: `"B.Tech"`)
- `status`: String (Enum: `["enrolled", "active", "completed", "dropped", "archived"]`, Default: `"enrolled"`)
- `enrolledAt`: Date (Default: `Date.now`)
- **Indexes:** `{ studentId: 1, subjectId: 1, academicYear: 1, semester: 1 }` (Unique)

#### 9. `SubjectRequest` Collection
Manages faculty course proposals submitted for administrator review.
- `_id`: ObjectId (Primary Key)
- `facultyId`: ObjectId (Required, ref: `Faculty`)
- `code`: String (Required, Uppercase, e.g. "CS499")
- `name`: String (Required, e.g. "Quantum Computing & Cryptography")
- `department`: String (Required, e.g. "CSE")
- `semester`: Number (Required, 1 to 8, Default: 1)
- `year`: Number (Computed: `Math.ceil(semester / 2)`)
- `academicYear`: String (Required, Default: `"2026-2027"`)
- `section`: String (Default: `"A"`)
- `credits`: Number (Default: 3, Min: 1, Max: 8)
- `program`: String (Default: `"B.Tech"`)
- `status`: String (Enum: `["pending", "approved", "rejected"]`, Default: `"pending"`)
- `adminRemarks`: String (Default: `""`)
- `reviewedBy`: ObjectId (ref: `Admin`)
- `reviewedAt`: Date
- `createdSubjectId`: ObjectId (ref: `Subject`)
- `createdTeachingAssignmentId`: ObjectId (ref: `TeachingAssignment`)
- **Indexes:** `{ code: 1, academicYear: 1, semester: 1, section: 1, status: 1 }`

#### 10. `Topic` Collection
Curriculum units within a course.
- `_id`: ObjectId (Primary Key)
- `subjectId`: ObjectId (Required, ref: `Subject`)
- `name`: String (Required, e.g. "Unit 1: Supervised Learning")
- `order`: Number (Required, e.g. 1)

#### 11. `Lecture` Collection
Recorded video lecture entries.
- `_id`: ObjectId (Primary Key)
- `topicId`: ObjectId (Required, ref: `Topic`)
- `uploadedBy`: ObjectId (Required, ref: `Faculty`)
- `title`: String (Required)
- `description`: String
- `videoUrl`: String (Required, Unique, Cloudinary secure URL)
- `cloudinaryPublicId`: String (Required, Unique)
- `thumbnailUrl`: String (Required, derived Cloudinary image URL)
- `duration`: Number (Seconds, derived from Cloudinary metadata)
- **Indexes:** `{ videoUrl: 1 }` (Unique), `{ cloudinaryPublicId: 1 }` (Unique)

#### 12. `Comment` Collection
Threaded Q&A interactions on video lectures.
- `_id`: ObjectId (Primary Key)
- `lectureId`: ObjectId (Required, ref: `Lecture`)
- `studentId`: ObjectId (Required, ref: `Student`)
- `text`: String (Required)
- `replies`: Array of embedded subdocuments:
  - `facultyId`: ObjectId (Required, ref: `Faculty`)
  - `text`: String (Required)
  - `createdAt`, `updatedAt`: Date

#### 13. `Notification` Collection
In-app alerts delivered to users.
- `_id`: ObjectId (Primary Key)
- `recipient`: ObjectId (Required, user ID)
- `recipientRole`: String (Enum: `["student", "faculty", "admin"]`)
- `title`: String (Required)
- `message`: String (Required)
- `type`: String (Enum: `["info", "lecture", "session", "enrollment", "assignment", "system", "alert"]`)
- `link`: String (Navigation URL, e.g. `"/faculty/dashboard"`)
- `isRead`: Boolean (Default: `false`)
- `readAt`: Date
- `isCleared`: Boolean (Default: `false`)
- `clearedAt`: Date
- **Indexes:** `{ recipient: 1, isCleared: 1, createdAt: -1 }`

#### 14. `AuditLog` Collection
Security and operational audit trail.
- `_id`: ObjectId (Primary Key)
- `action`: String (Required, e.g. `"SUBJECT_REQUEST_STATUS_UPDATED"`)
- `category`: String (Enum: `["AUTH", "RBAC", "CURRICULUM", "SESSION", "SECURITY", "SYSTEM"]`)
- `details`: String (Required)
- `actor`: String (Default: `"System Admin"`)
- `actorEmail`: String
- `ipAddress`: String
- `severity`: String (Enum: `["INFO", "WARNING", "CRITICAL"]`)
- `status`: String (Enum: `["SUCCESS", "FAILED", "FLAGGED"]`)

---

## 8. Interface & REST API Catalog

The backend exposes the following verified endpoints, mapped by functional area:

### 8.1 Authentication & Profile Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `POST` | `/student/signup` | Public | `{ name, email, password, mis, department, year }` | Registers student account; validates `@iiitp.ac.in` domain |
| `POST` | `/student/login` | Public | `{ email/mis, password }` | Authenticates student; returns `{ student, token }` |
| `GET` | `/student/profile` | Student | None | Fetches student profile and academic year standing |
| `POST` | `/faculty/login` | Public | `{ email, password }` | Authenticates faculty; returns `{ faculty, token }` |
| `GET` | `/faculty/profile` | Faculty | None | Fetches faculty bio, office hours, and active assignments |
| `PUT` | `/faculty/profile` | Faculty | `{ designation, phone, officeLocation, officeHours, ... }` | Updates faculty contact details and bio |
| `PUT` | `/faculty/change-password` | Faculty | `{ currentPassword, newPassword }` | Changes faculty password after credential verification |
| `POST` | `/admin/login` | Public | `{ email, password }` | Authenticates administrator; returns `{ admin, token }` |
| `GET` | `/admin/profile` | Admin | None | Fetches admin profile, security clearances, and stats |
| `PUT` | `/admin/profile` | Admin | `{ name, designation, phone, avatar }` | Updates admin profile metadata |
| `PUT` | `/admin/change-password` | Admin | `{ currentPassword, newPassword }` | Updates admin master password |

### 8.2 Academic Session & Semester Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `GET` | `/admin/currentSession` | Admin | None | Retrieves current active session parameters (AY 2026-2027) |
| `PUT` | `/admin/update` | Admin | `{ academicYear, term, termName, activeSemesters }` | Updates college-wide active academic session |
| `GET` | `/admin/semesters` | Admin | None | Lists all configured semester blocks across academic years |
| `POST` | `/admin/semesters` | Admin | `{ academicYear, semesterNumber, name, status, isCurrent }` | Creates a new semester block |
| `PUT` | `/admin/semesters/:id` | Admin | `{ name, status, isCurrent, startDate, endDate }` | Modifies semester metadata and active status |
| `DELETE`| `/admin/semesters/:id` | Admin | None | Removes a semester block |

### 8.3 Course Addition Request Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `POST` | `/faculty/request-subject` | Faculty | `{ code, name, department, semester, section, credits }` | Submits new course offering proposal; alerts Admins |
| `GET` | `/faculty/subject-requests` | Faculty | None | Retrieves course proposals submitted by the logged-in faculty |
| `GET` | `/admin/subject-requests` | Admin | None | Lists all course addition requests across all faculty |
| `PATCH`| `/admin/subject-requests/:id/status`| Admin | `{ status: "approved"\|"rejected", adminRemarks }` | Transactionally reviews and approves/rejects request |

### 8.4 Teaching Allocation & Course Roster Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `GET` | `/faculty/courses` | Faculty | Query: `{ academicYear, semester }` | Fetches active course offerings taught by logged-in faculty |
| `GET` | `/faculty/courses/:subjectId/roster` | Faculty | Query: `{ academicYear, semester, section }` | Fetches active enrolled student roster for a course |
| `GET` | `/faculty/courses/:subjectId/roster/export` | Faculty | Query: `{ academicYear, semester, section }` | Downloads the course enrollment roster as a `.csv` file |
| `POST` | `/admin/assign` | Admin | `{ facultyId, subjectId, academicYear, semester, section }` | Creates a manual teaching assignment |
| `DELETE`| `/admin/assign/:id` | Admin | None | Deletes or archives an active teaching assignment |

### 8.5 Student Enrollment & Course Discovery Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `GET` | `/student/current-courses` | Student | None | Fetches active semester courses for student in AY 2026–2027 |
| `GET` | `/student/past-semesters` | Student | None | Fetches archived courses from prior semesters (Read-Only) |
| `GET` | `/student/courses/:subjectId` | Student | None | Fetches course space details with topics and lecture counts |
| `POST` | `/admin/enroll-student` | Admin | `{ studentId, subjectIds, academicYear, semester }` | Manually enrolls an individual student into subjects |
| `POST` | `/admin/enroll-batch` | Admin | `{ department, year, semester, academicYear, subjectIds }` | Batch-enrolls an entire academic cohort into subjects |
| `GET` | `/admin/enrollments` | Admin | Query: `{ academicYear, semester, department }` | Lists enrollments matching search and filter criteria |
| `DELETE`| `/admin/enrollments/:id`| Admin | None | Drops a student enrollment record |
| `PUT` | `/admin/promote` | Admin | `{ fromYear, toYear, targetSemester, academicYear }` | Promotes student cohort; archives previous enrollments |

### 8.6 Curriculum, Lecture, & Q&A Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `GET` | `/subject` | Authenticated | None | Retrieves subjects catalog; filtered by department/year |
| `POST` | `/subject/create` | Admin | `{ name, code, department, year, allowedSemesters }` | Creates a new subject catalog entry |
| `GET` | `/topic/:subjectId` | Authenticated | None | Fetches topics for a subject (enforces student enrollment) |
| `POST` | `/topic` | Faculty | `{ subjectId, name, order }` | Creates a topic (gated by `checkTeachingAssignment`) |
| `GET` | `/lecture/topic/:topicId`| Authenticated | None | Fetches lectures under a topic (enforces enrollment) |
| `GET` | `/lecture/:lectureId` | Authenticated | None | Fetches single lecture streaming metadata and topic tree |
| `GET` | `/lecture/my-lectures`| Faculty | Query: `{ subjectId, topicId, search }` | Lists lectures uploaded by the faculty with Q&A metrics |
| `POST` | `/lecture/upload` | Faculty | Multipart: `{ topicId, title, description, video }` | Uploads video to Cloudinary; generates thumbnail and duration |
| `DELETE`| `/lecture/:lectureId` | Faculty/Admin | None | Deletes lecture, removes video from Cloudinary, drops comments |
| `GET` | `/comment/getComment/:lectureId` | Authenticated | None | Fetches threaded comments and faculty replies for a lecture |
| `POST` | `/comment/postComment`| Student | `{ lectureId, text }` | Submits question (rejected if course is in archived semester) |
| `POST` | `/comment/postReply` | Faculty | `{ commentId, text }` | Submits instructor reply (strictly verified to uploader) |

### 8.7 Notifications & Security Audit Endpoints

| Method | Endpoint | Access / Role | Request Payload Summary | Response / Purpose |
|---|---|---|---|---|
| `GET` | `/notifications` | Authenticated | None | Fetches uncleared user notifications and unread counter |
| `PATCH`| `/notifications/:id/read` | Authenticated | None | Marks an individual notification as read |
| `POST` | `/notifications/mark-all-read` | Authenticated | None | Marks all active user notifications as read |
| `DELETE`| `/notifications/:id` | Authenticated | None | Dismisses/clears an individual notification |
| `POST` | `/notifications/clear-all` | Authenticated | None | Bulk dismisses/clears all user notifications |
| `GET` | `/admin/security-logs`| Admin | None | Retrieves immutable security audit log entries |
| `GET` | `/admin/directories` | Admin | None | Returns directory aggregates: faculty, students, subjects, requests |

---

## 9. Important Business Rules & Validation Invariants

1. **Academic Session Baseline (`2026–2027`):**
   - All active operations, subject requests, enrollments, and teaching assignments default to and validate against `ACTIVE_ACADEMIC_YEAR = "2026-2027"`.
   - Concurrent active semesters for the Autumn term are `1, 3, 5, 7`.
   - The UI displays `1st Semester`, `3rd Semester`, `5th Semester`, and `7th Semester` without embedding year numbers.
2. **Global Course Code Uniqueness:**
   - Every subject must possess a unique course code (`unique: true` in Mongoose, uppercase trimmed). Duplicate codes are rejected with HTTP 409 Conflict.
3. **Subject Request Conflict Prevention:**
   - A faculty member cannot request a course offering if they are already actively assigned to teach that course in the same term.
   - The system prevents redundant pending requests for the same course code, academic year, semester, and section (`{ code, academicYear, semester, section, status: "pending" }`).
4. **Atomic Materialization on Approval:**
   - Subject request approval executes within an ACID transaction. If subject creation, semester verification, teaching assignment creation, or student auto-enrollment fails, the transaction is rolled back, leaving zero phantom records.
5. **Read-Only Past Semester Policy:**
   - Students can view archived lectures from prior semesters, but `postComment` throws HTTP 403 Forbidden on archived courses to protect academic records from retrospective modification.
6. **Instructor Exclusivity on Replies:**
   - Only the faculty member who uploaded the lecture (`lecture.uploadedBy === req.user._id`) is permitted to submit official instructor replies. Foreign faculty members are blocked with HTTP 403.
7. **Institutional Email Gating:**
   - Student signup is strictly gated to the `@iiitp.ac.in` domain.

---

## 10. Error Handling & Security Implementation

### 10.1 Centralized Error Architecture
Backend error handling relies on two foundational utilities:
1. **`ApiError`:** Custom `Error` subclass capturing HTTP status codes, structured error messages, and stack traces.
2. **`errorHandler` Middleware:** Catches unhandled errors and maps them to consistent JSON envelopes:
   ```javascript
   export const errorHandler = (err, req, res, next) => {
     let statusCode = err.statusCode || 500;
     let message = err.message || "Internal Server Error";
     return res.status(statusCode).json({
       statusCode,
       data: null,
       message,
       success: false,
       errors: err.errors || [],
     });
   };
   ```

### 10.2 Implemented Security Controls vs. Recommended Enhancements

| Security Domain | Implemented in Current Codebase | Recommended Future Improvement |
|---|---|---|
| **Authentication** | 7-day signed HMAC SHA-256 JWTs via `verifyJWT` | Migrate tokens from localStorage to `HttpOnly`, `SameSite=Strict` cookies |
| **Password Storage** | `bcrypt` with salt rounds = 10, pre-save hooks | Implement zxcvbn password entropy validation server-side |
| **Authorization (RBAC)**| Role whitelist middleware (`authorize("admin", ...)`) | Implement fine-grained attribute-based access control (ABAC) |
| **Domain Invariant Guard**| `checkTeachingAssignment` validates active term | Cache assignment lookups in Redis for high-throughput scaling |
| **Media Security** | Server temp files unlinked synchronously; Cloudinary authenticated destroy | Implement signed Cloudinary delivery URLs for non-public assets |
| **Audit Logging** | High-severity events logged to `AuditLog` collection | Stream audit logs to external SIEM / CloudWatch / Datadog |
| **Rate Limiting** | Body size limits (500MB video, standard JSON) | Add `express-rate-limit` to prevent brute-force on `/login` |

---

## 11. Testing Strategy and Verified Results

### 11.1 Available Test Suites and Verification Scripts
The AcadeX repository includes automated integration test suites located in `Backend/scripts/`:

1. **Comprehensive Academic Workflow Suite (`verify_full_academic_workflow.js`):**
   - **Coverage:** 14 sequential cross-module scenarios executing end-to-end against live MongoDB Atlas.
   - **Executed Scenarios:** Faculty request submission (HTTP 201), admin approval transaction (HTTP 200), faculty dashboard visibility, catalog integrity without duplicates, eligible vs. ineligible student access, 409 conflict handling, approval idempotency (HTTP 400), request rejection flow, cohort promotion, historical roster retention (`completed` status), profile persistence, role security boundaries, simulated transaction rollback, and notification/audit verification.
   - **Result:** **14 / 14 Tests Passing (100% Success)**.

2. **Subject Request & Notification Suite (`test_subject_request_flow.js`):**
   - **Coverage:** 10 integration tests validating the faculty course proposal flow, instant admin alert creation, directory requests tab visibility, approval confirmation notifications, and duplicate prevention.
   - **Result:** **10 / 10 Tests Passing (100% Success)**.

3. **Database Inspection Tool (`inspect_db.js`):**
   - **Coverage:** Validates database collections, ensures `AcademicSession` is configured for AY 2026–2027 Autumn Term, verifies active semesters (`[1, 3, 5, 7]`), and inspects active student enrollments.

---

## 12. Limitations & Future Roadmap

### 12.1 Verified Current Limitations
1. **Polling-Based Notifications:** In-app alerts use client-side polling (30s interval) via React Query rather than instant WebSocket push.
2. **Synchronous Upload Processing:** Uploading very large files (approaching 500MB) blocks the HTTP request worker until Cloudinary upload completes.
3. **Mandatory Batch Enrollment:** Approving a course currently auto-enrolls all students in the department and semester; elective self-selection by students is not yet supported.

### 12.2 Planned Future Enhancements
1. **Background Ingestion Worker:** Implement BullMQ / Redis worker queue for asynchronous background video transcoding.
2. **WebSocket Gateway:** Real-time push notifications for instant student-faculty alerts and live Q&A updates.
3. **Student Elective Bidding:** Dedicated portal for students to browse approved elective courses and self-enroll during an add/drop window.
4. **Playback Speed & Bookmarks:** Custom player enhancements including 1.25x/1.5x/2x playback controls and student bookmarking of video timestamps.
