# 🎓 AcadeX — College Lecture Archive & Digital Curriculum Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Mongoose_9-brightgreen.svg)](https://www.mongodb.com/atlas)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Video_CDN-blueviolet.svg)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

AcadeX is an institutional lecture archive and academic resource management platform built for engineering colleges (specifically tailored to the Indian Institute of Information Technology Pune academic structure). It provides a structured, searchable repository for recorded course lectures arranged strictly by **Academic Session → Semester → Subject → Topic → Lecture → Discussion/Q&A**.

---

## 📌 Table of Contents

- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Workflows](#-core-workflows)
- [Academic Structure & Configuration](#-academic-structure--configuration)
- [Project Directory Structure](#-project-directory-structure)
- [Installation & Local Setup](#-installation--local-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Entities & Architecture](#-database-entities--architecture)
- [Automated Verification & Test Suites](#-automated-verification--test-suites)
- [Troubleshooting Common Issues](#-troubleshooting-common-issues)
- [Contributing & Project Status](#-contributing--project-status)

---

## 📖 Project Overview

### Problem Statement
College students frequently miss portions of lectures due to illness, conflicting responsibilities, or cognitive overload during dense technical explanations. Generic file-sharing drives or unlisted video playlists lead to fragmented materials, broken access control, zero linkage with official course rosters, and chaotic discussion channels.

### Purpose and Objectives
AcadeX provides a role-governed portal that structures all recorded instruction into an official academic curriculum:
1. **Curriculum Hierarchy:** Organizes learning resources cleanly into Subjects, Topics, and numbered video lectures.
2. **Access Control & Privacy:** Restricts access to verified college members (`@iiitp.ac.in`) with role-based dashboard views.
3. **Faculty Course Requests:** Enables faculty to formally propose course offerings with transactional administrator review and automatic student enrollment.
4. **Adaptive Media Delivery:** Delivers high-resolution video streams (up to 1080p) via Cloudinary with dynamic thumbnails and chunked upload handling.
5. **Threaded Q&A Discussions:** Allows students to post academic questions on specific lectures, while restricting official answers exclusively to the verified course instructor.

---

## 🛠 Technology Stack

### Frontend (Single Page Application)
- **Framework:** React 19 (`react`, `react-dom` ^19.2.8)
- **Build Tool:** Vite 8 (`vite` ^8.2.0)
- **Routing:** React Router DOM v7 (`react-router-dom` ^7.18.2) with declarative `ProtectedRoute` guards
- **Server State & Caching:** TanStack React Query v5 (`@tanstack/react-query` ^5.102.8) with 30s background polling
- **HTTP Client:** Axios (`axios` ^1.19.0) with automatic JWT `Bearer` token injection
- **UI Components & Icons:** Material UI v9 (`@mui/material`, `@emotion/react`), Lucide React (`lucide-react` ^1.55.0)
- **Animations:** Framer Motion (`framer-motion` ^13.1.1)

### Backend (REST API Service)
- **Runtime:** Node.js v18+ running in ECMAScript Modules (`"type": "module"`)
- **Web Framework:** Express 5 (`express` ^5.2.1)
- **Database ODM:** Mongoose 9 (`mongoose` ^9.8.1)
- **Authentication & Security:** JSON Web Tokens (`jsonwebtoken` ^9.0.3), password hashing via `bcrypt` (^6.0.0), CORS (`cors` ^2.8.6)
- **File Ingestion:** `express-fileupload` (^1.5.2) with temporary file streaming and 500MB upload ceiling
- **Development Tooling:** Nodemon (`nodemon` ^3.1.14), Dotenv (`dotenv` ^17.4.2)

### Cloud Infrastructure & Database
- **Database:** MongoDB Atlas (Replica Set cluster supporting multi-document ACID transactions)
- **Media CDN:** Cloudinary Programmable Media API (`cloudinary` ^2.10.0) for chunked video ingestion, thumbnail derivation, and streaming

---

## 👥 User Roles & Permissions

AcadeX implements strict Role-Based Access Control (RBAC) across three distinct user roles:

| Capability / Action | Student | Faculty | Admin |
|---|:---:|:---:|:---:|
| **Account Self-Registration** | ✅ (via `@iiitp.ac.in`) | ❌ (Created by Admin) | ❌ (Bootstrapped) |
| **Browse Active Semester Courses** | ✅ (Enrolled only) | ✅ (Assigned only) | ✅ (All courses) |
| **Watch Video Lectures & Change Quality** | ✅ | ✅ | ✅ |
| **Post Questions / Comments** | ✅ (Active terms only) | ❌ (Replies only) | ❌ |
| **Post Instructor Official Replies** | ❌ | ✅ (Uploader only) | ❌ |
| **Propose Course Offering (Subject Request)** | ❌ | ✅ | ❌ |
| **Approve / Reject Course Requests** | ❌ | ❌ | ✅ |
| **Create Topics & Upload Lectures** | ❌ | ✅ (Assigned only) | ❌ |
| **View Course Roster & Export CSV** | ❌ | ✅ (Assigned only) | ✅ |
| **Manage Academic Sessions & Semesters** | ❌ | ❌ | ✅ |
| **Promote Students to Next Year** | ❌ | ❌ | ✅ |
| **View Immutable Security Audit Logs** | ❌ | ❌ | ✅ |

---

## ⚡ Core Workflows

### 1. Student Signup and Authentication
- Students register using full name, unique MIS number, college email (`@iiitp.ac.in`), password, department (`CSE` / `ECE`), and starting year.
- Upon signup, the backend hashes the password with `bcrypt` (10 rounds) and computes `currentSemester = (year - 1) * 2 + 1`.
- Students log in using either their MIS number or email. The backend issues a 7-day signed JWT containing `{ id, role: "student" }`.

### 2. Faculty Course Requests and Administrative Approval
1. **Proposal:** A faculty member opens the "Request Course Offering" modal on their dashboard, specifying course code, subject name, department, semester (`1st, 3rd, 5th, or 7th`), section, and credits.
2. **Conflict Checking:** The system checks for existing teaching assignments and rejects duplicate pending requests with HTTP 409 Conflict.
3. **Admin Alert:** All active administrators receive an instant in-app notification ("Course Request: CSxxx").
4. **Atomic Transaction Approval:** An administrator reviews the request under Central Command and clicks "Approve":
   - The backend begins a multi-document Mongoose transaction (`session.startTransaction()`).
   - Resolves canonical `Subject` (reuses existing catalog record or creates a new entry).
   - Ensures the target `Semester` is created and active.
   - Activates a `TeachingAssignment` for the requesting faculty member.
   - Automatically enrolls all eligible students matching the department and semester into `StudentEnrollment`.
   - Updates `SubjectRequest` status to `approved` and dispatches an approval notification to the faculty.
   - Commits the transaction atomically.

### 3. Lecture Studio & Adaptive Streaming
1. **Upload:** An assigned faculty member selects an active subject and topic, enters lecture title and description, and selects an MP4/MKV video file up to 500MB.
2. **Ingestion:** `express-fileupload` stores the temp file in the OS temp directory; the backend streams it to Cloudinary in 6MB chunks (`cloudinary.uploader.upload_large`).
3. **Asset Generation:** Cloudinary returns a secure URL; the backend derives the thumbnail URL (`.jpg` transformation) and duration, saving the `Lecture` record and cleaning up local disk files.
4. **Playback:** Students watch the video with on-the-fly resolution switching (360p, 480p, 720p, 1080p, auto) powered by Cloudinary transformation URLs.

### 4. Course Rosters and CSV Export
- Faculty members can click "View Roster" on any of their active course cards to open the Course Roster Drawer.
- The drawer displays enrolled students, their MIS, standing, and enrollment status.
- Clicking "Export CSV" queries `/faculty/courses/:subjectId/roster/export` to download a standardized CSV file for grading and attendance tracking.

### 5. Threaded Q&A Moderation
- Students ask lecture-specific questions in active courses.
- Archived past-semester lectures display a lock badge and disallow new comments to preserve historical records.
- Faculty review unanswered questions and submit official replies, which display with verified instructor styling.

---

## 🏛 Academic Structure & Configuration

AcadeX is centrally configured for the **2026–2027 Academic Year**:

```
Academic Year: 2026–2027 (Autumn / Odd Term)
├── 1st Semester ── B.Tech Year 1 (CSE / ECE)
├── 3rd Semester ── B.Tech Year 2 (CSE / ECE)
├── 5th Semester ── B.Tech Year 3 (CSE / ECE)
└── 7th Semester ── B.Tech Year 4 (CSE / ECE)
```

- **Semester Labels:** The UI strictly presents options as `1st Semester`, `3rd Semester`, `5th Semester`, and `7th Semester` without embedding redundant year numbers into semester selection fields.
- **Centralized Config:** Maintained in `Backend/utils/academicConfig.js` and `Frontend/src/constants.js`.

---

## 📁 Project Directory Structure

```
Acadex/
├── Architectural.md                     # Deep system architecture & SDLC analysis
├── Architecture.md                      # UI/UX design specifications
├── Software Design Document.md          # Formal software design document (SDD v2.0)
├── README.md                            # Project overview & developer guide
│
├── Backend/                             # Express REST API (ES Modules)
│   ├── .env                             # Local environment secrets (ignored by git)
│   ├── app.js                           # Express application & middleware assembly
│   ├── index.js                         # HTTP server initialization (Port 10000)
│   ├── package.json                     # Backend dependencies & scripts
│   ├── controllers/                     # Application business logic
│   │   ├── admincontroller.js           # Approvals, sessions, promotions, directories
│   │   ├── facultycontroller.js         # Course offerings, rosters, CSV export, requests
│   │   ├── studentcontroller.js         # Enrollment discovery, course spaces, signup/login
│   │   ├── lecturecontroller.js         # Video upload, Cloudinary ingestion, deletion
│   │   ├── commentcontroller.js         # Discussion posts, instructor replies
│   │   ├── notificationcontroller.js    # In-app notifications & unread counts
│   │   ├── subjectcontroller.js         # Canonical subject catalog
│   │   └── topiccontroller.js           # Topic units
│   ├── middlewares/                     # Express request pipeline filters
│   │   ├── authmiddleware.js            # JWT Bearer token verification (verifyJWT)
│   │   ├── rolemiddleware.js            # RBAC authorization guard (authorize)
│   │   ├── teachingassignmentmiddleware.js # Assignment validation (checkTeachingAssignment)
│   │   └── errorHandler.js              # Centralized error normalization
│   ├── models/                          # Mongoose ODM Schemas (14 Collections)
│   │   ├── AcademicSession.js           # College-wide academic session singleton
│   │   ├── Admin.js                     # Administrator credentials & security metadata
│   │   ├── AuditLog.js                  # Security and operational audit trail
│   │   ├── Comments.js                  # Discussion threads & instructor replies
│   │   ├── Faculty.js                   # Faculty bio, office hours, credentials
│   │   ├── Lecture.js                   # Video metadata, Cloudinary URLs, thumbnails
│   │   ├── Notification.js              # In-app user notifications
│   │   ├── Semester.js                  # Term definitions (Sem 1, 3, 5, 7)
│   │   ├── Student.js                   # Student accounts & academic standing
│   │   ├── StudentEnrollment.js         # Student course registrations
│   │   ├── Subject.js                   # Master course catalog
│   │   ├── SubjectRequest.js            # Course addition proposals
│   │   ├── TeachingAssignment.js        # Faculty-to-course allocations
│   │   └── Topic.js                     # Topic units within subjects
│   ├── routes/                          # Express REST API route definitions
│   ├── scripts/                         # Automated verification & test suites
│   │   ├── verify_full_academic_workflow.js # 14-scenario academic workflow test suite
│   │   ├── test_subject_request_flow.js     # 10-scenario course request test suite
│   │   ├── inspect_db.js                    # Database state inspector
│   │   └── reconcile_academic_2026_2027.js  # Term reconciliation & repair
│   └── utils/                           # Shared utility helpers (Cloudinary, ApiError)
│
└── Frontend/                            # React 19 Single Page Application (Vite 8)
    ├── index.html                       # Application HTML shell
    ├── package.json                     # Frontend dependencies & scripts
    ├── vite.config.js                   # Vite configuration
    ├── .env                             # Frontend environment configuration
    ├── .env.example                     # Environment template
    ├── public/                          # Static public assets
    └── src/
        ├── App.jsx                      # Client route definitions & page transitions
        ├── main.jsx                     # Application entry point & QueryClientProvider
        ├── constants.js                 # Academic years, semester labels, departments
        ├── theme.js                     # Design system colors & glassmorphic tokens
        ├── api/                         # Axios service modules
        │   ├── admin.js                 # Admin API calls
        │   ├── faculty.js               # Faculty offerings & roster calls
        │   ├── student.js / subjects.js # Student courses & catalog calls
        │   ├── lectures.js              # Lecture upload & video streaming calls
        │   ├── comments.js              # Comments & reply calls
        │   ├── notifications.js         # Notification lifecycle calls
        │   └── axios.js                 # Axios instance with Bearer interceptor
        ├── components/
        │   ├── ProtectedRoute.jsx       # Route-level authorization guard
        │   ├── layout/                  # Sidebar, TopHeader, AppLayout
        │   └── common/                  # Skeletons, PasswordField, ErrorState
        ├── context/                     # Global AuthContext & useAuth hook
        └── pages/                       # Application page views
            ├── LoginPage.jsx            # Unified multi-role login
            ├── SignupPage.jsx           # Student self-registration
            ├── StudentDashboard.jsx     # Course library (Active vs. Archived)
            ├── FacultyDashboard.jsx     # Offerings, requests, roster drawer
            ├── FacultyLecturesPage.jsx  # Lecture management & Q&A filters
            ├── UploadLecturePage.jsx    # Video studio upload
            ├── AdminDashboard.jsx       # Central command & directories
            ├── AdminProfilePage.jsx     # Security audit logs & credentials
            ├── LecturePlayerPage.jsx    # Theater video player & discussion
            ├── TopicsPage.jsx           # Course topic units
            └── LecturesPage.jsx         # Lectures list
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher (Node.js v22.x LTS recommended)
- **npm:** v9.0.0 or higher
- **MongoDB Atlas:** An accessible MongoDB cluster (Replica Set enabled for transactions)
- **Cloudinary:** A free Cloudinary account for media uploads

### 1. Clone the Repository
```bash
git clone https://github.com/aaryankumar1435-maker/Acadex.git
cd Acadex
```

### 2. Configure Backend Environment
Create a `.env` file inside the `Backend/` directory:

```bash
cd Backend
```

Add your environment parameters:
```env
PORT=10000
MONGO_DB_URL=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/Acadex?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
```

### 3. Install Backend Dependencies & Start Server
```bash
# Inside Backend/
npm install

# Start in development mode (with Nodemon):
npm run dev

# Or start in standard production mode:
npm start
```
The backend server will start on: `http://localhost:10000`.

### 4. Configure Frontend Environment
In a new terminal window, navigate to the `Frontend/` directory:

```bash
cd ../Frontend
```

Create a `.env` file in `Frontend/`:
```env
VITE_API_BASE_URL=http://localhost:10000
```

### 5. Install Frontend Dependencies & Start Dev Server
```bash
# Inside Frontend/
npm install

# Start Vite development server:
npm run dev
```
The application will launch on: `http://localhost:5173`.

---

## 🔒 Environment Configuration Reference

### Backend (`Backend/.env`)

| Variable Name | Required | Default | Description |
|---|:---:|:---:|---|
| `PORT` | Optional | `10000` | Port on which the Express server listens |
| `MONGO_DB_URL` | **Required** | — | MongoDB Atlas connection string (Must support replica set transactions) |
| `JWT_SECRET` | **Required** | — | Cryptographic secret for signing JWT access tokens |
| `CLOUD_NAME` | **Required** | — | Cloudinary cloud account name |
| `API_KEY` | **Required** | — | Cloudinary API Key |
| `API_SECRET` | **Required** | — | Cloudinary API Secret |

### Frontend (`Frontend/.env`)

| Variable Name | Required | Default | Description |
|---|:---:|:---:|---|
| `VITE_API_BASE_URL` | Optional | `http://localhost:10000` | Base URL pointing to the backend Express server |

> [!CAUTION]
> Never commit `.env` files containing real production passwords, database connection strings, or Cloudinary credentials to version control. Both `.gitignore` files are pre-configured to exclude `.env`.

---

## 📊 Database Entities & Architecture

AcadeX utilizes **14 collections** in MongoDB Atlas:

```
[AcademicSession] ── governs ──► [Semester]
        │                             │
        ▼                             ▼
   [Subject] ◄── [TeachingAssignment] ◄── [Faculty]
        │                  │                  │
        │                  ▼                  ▼
        ├─────────► [StudentEnrollment]   [Lecture] ── uploadedBy
        │                  ▲                  │
        ▼                  │                  ▼
     [Topic]        [Student]             [Comment] ◄── writes ── [Student]
        │                                     │
        ▼                                     ▼
    [Lecture] ────────────────────────► [Embedded Replies] ◄── [Faculty]
```

1. **`Admin`:** Administrator accounts, designations, avatar, and domain permissions.
2. **`Faculty`:** Instructor profiles, office hours, contact info, and department.
3. **`Student`:** Student accounts, unique MIS, email, department, and semester standing.
4. **`AcademicSession`:** Singleton document storing AY `2026–2027` and active term semesters `[1, 3, 5, 7]`.
5. **`Semester`:** Curriculum term blocks with status transitions (`pending_enrollment`, `active`, `archived`).
6. **`Subject`:** Canonical course catalog entries with unique course codes and allowed semester arrays.
7. **`TeachingAssignment`:** Allocations linking faculty to subjects, academic years, semesters, and sections.
8. **`StudentEnrollment`:** Explicit student course registrations preserving active and completed term histories.
9. **`SubjectRequest`:** Faculty-submitted course proposals with approval/rejection lifecycle states.
10. **`Topic`:** Ordered curriculum units within a course.
11. **`Lecture`:** Video lecture metadata, Cloudinary URLs, derived thumbnails, and durations.
12. **`Comment`:** Threaded student lecture questions with embedded official faculty replies.
13. **`Notification`:** User-level alerts with read tracking and dismissal options.
14. **`AuditLog`:** Immutable security and operational audit trail.

---

## 🧪 Automated Verification & Test Suites

The codebase includes executable integration test suites that validate system behavior directly against the database:

### 1. Comprehensive Academic Workflow Suite
Tests 14 cross-module scenarios including faculty request submission, transactional approval, catalog integrity, student dashboard availability, 409 duplicate rejection, approval idempotency, request rejection, cohort promotion, historical roster retention, and simulated transaction failure rollback.

```bash
cd Backend
node scripts/verify_full_academic_workflow.js
```
**Current Status:** `TOTAL TESTS RUN: 14 | PASSED: 14 | FAILED: 0 (100% Success)`

### 2. Subject Request & Notification Suite
Validates the course proposal flow, real-time admin alert generation, directory listing, approval notification dispatch, and duplicate request prevention.

```bash
cd Backend
node scripts/test_subject_request_flow.js
```
**Current Status:** `RESULTS: 10 PASSED, 0 FAILED (100% Success)`

### 3. Live Database Inspector
Inspects live collections, verifying active academic sessions, semester records, catalog subjects, and student enrollments.

```bash
cd Backend
node scripts/inspect_db.js
```

---

## 🔧 Troubleshooting Common Issues

### 1. MongoDB Transaction Errors (`Transaction numbers are only allowed on a replica set`)
- **Cause:** MongoDB is running in standalone mode without a replica set.
- **Solution:** Connect to a MongoDB Atlas cluster, which operates as a replica set by default.

### 2. Cloudinary Upload Failure (`Video upload to Cloudinary failed`)
- **Cause:** Invalid or missing `CLOUD_NAME`, `API_KEY`, or `API_SECRET` in `Backend/.env`.
- **Solution:** Double-check your Cloudinary dashboard credentials. Note that variable names must match `CLOUD_NAME`, `API_KEY`, and `API_SECRET`.

### 3. Network Connection Error on Frontend (`Cannot reach the server`)
- **Cause:** The backend is not running, or running on a different port than expected by the frontend.
- **Solution:** Verify the backend is listening on port 10000. Check `VITE_API_BASE_URL` in `Frontend/.env`.

### 4. Student Signup Gating (`Only IIIT Pune college emails are allowed to register`)
- **Cause:** Attempting to register a student with an email that does not end in `@iiitp.ac.in`.
- **Solution:** Use an institutional email address (e.g. `rohan.gupta@iiitp.ac.in`).

### 5. Video File Size Rejection (`Video file size exceeds maximum allowed limit`)
- **Cause:** The uploaded video exceeds the 500MB limit.
- **Solution:** Compress the video using standard H.264/AAC encoding or upload a file under 500MB.

---

## 🤝 Contributing & Project Status

### Project Status
AcadeX is in **Project Final** status. The current codebase has been reconciled and verified against all core academic requirements for the **2026–2027** academic year.

### Contribution Guidelines
1. Fork the repository and create a feature branch (`git checkout -b feature/academic-enhancement`).
2. Make your modifications following standard ES Module syntax in the backend and React component best practices in the frontend.
3. Run the automated verification suites (`node Backend/scripts/verify_full_academic_workflow.js`) to ensure zero regressions.
4. Commit your changes with clear, descriptive commit messages.
5. Push to your branch and submit a Pull Request.
