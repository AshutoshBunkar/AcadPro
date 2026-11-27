# AcadPro UI/UX redesign plan

**Design direction chosen on 28 November 2026** · Warm white pages, deep teal actions, editorial headings.

The first screen should answer a different question for each role. A student asks, “Where’s the latest lecture for my course?” A faculty member asks, “Which section am I teaching, and where do I upload?” An admin asks, “What needs my attention this term?” Build the interface around those questions. Measure success by whether people can finish those tasks on their first attempt.

## 1. What the current interface tells us

| Observation from the frontend | Design decision |
| --- | --- |
| Jet black, cyan and pink are defined in CSS, Tailwind and MUI, then repeated as hex values inside screens. | Introduce one shared palette. Migrate a complete workflow at a time so its fields, menus and dialogs change together. |
| Students already have Current and Archived views, plus a direct **Play latest** link. Summary cards and repeated headings appear above the course list. | Put courses immediately below the page title and tabs. Give the latest lecture title enough room to identify it. |
| Upload can preselect the first offering that matches a subject ID. A faculty member can teach the same subject in two sections. | Carry the exact teaching assignment ID from the selected course. Display semester and section beside the upload title. |
| Admin manages six directory tabs alongside quick actions. Faculty assignment now includes first-time session setup and semester eligibility. | Give assignments and requests direct entry points. Carry the saved session and eligible course list through the redesigned flow. |
| The mobile drawer effect watches its own open state and can close as soon as it opens. | Check this on a phone-sized viewport in the first implementation phase. Opening the menu must leave it usable until dismissal or navigation. |

## 2. Color, typography and layout

Use a warm paper background and white work surfaces. Give page titles a serif voice and keep forms, lecture lists and dense tables in a highly legible sans serif. A student should recognize a course by its name, code and section even with all color removed.

| Use | Proposed values | Application |
| --- | --- | --- |
| Canvas and surface | `#F7F6F1` and `#FFFFFF` | Warm canvas behind content. White panels for a form, course list or table. Keep a dark surround immediately behind the video. |
| Main and secondary text | `#192D2A` and `#526460` | Titles and body copy in ink. Secondary text for faculty names, dates and metadata. |
| Primary action | White on `#00695E` | **Assign faculty**, **Publish lecture**, **Sign in**. Reserve the filled button for the main action in its region. Use `#00554D` on hover. |
| Selection and focus | `#00695E` on `#DDF1E9` | Selected tab or row. Show a checkmark or underline as well. Use a 2 px teal keyboard focus ring with a visible offset. |
| Dividers and inputs | `#D9E1DC` and `#778882` | Soft dividers between rows. Use the stronger border where users need to recognize an editable control. |
| Feedback | Green `#356046` on `#E4F2E7`; amber `#754813` on `#FBEACB`; red `#993F37` on `#FBEAE7` | Pair color with a specific label such as **Published**, **Pending approval** or **Upload failed**. |

The proposed white-on-teal button pairing has a calculated contrast ratio of **6.60 to 1**. Secondary text on white is **6.27 to 1**. Recheck hover, focus, inline links and validation messages on their rendered backgrounds during implementation.

| Element | Typeface and size | Usage |
| --- | --- | --- |
| Page title | **Spectral**, weight 600, 36/42 px desktop, 28/34 px mobile | One title per page, for example **My courses**. Fall back to Georgia. Allow long titles to wrap. |
| Section and course titles | **DM Sans**, 600, 20/28 px and 18/24 px | Use the same course title treatment across student and faculty views. |
| Body, labels and metadata | **DM Sans**, 400–600, 16/24 px body, 14/20 px labels, 13/18 px metadata | Use tabular numerals for counts and semester columns. Fall back to system sans serif. |

Use 4, 8, 12, 16, 24 and 32 px spacing increments. Start with 16 px mobile gutters, 32 px desktop gutters, 10 px control corners and 14 px panel corners. Limit reading and form columns to about 640 px. Give directories up to 1280 px. A thin divider is enough to separate most course rows. Reserve elevation for menus and dialogs.

## 3. Screen and navigation plan

| Area | First thing the user sees | Actions and details |
| --- | --- | --- |
| Sign in, signup and email links | A centered form with a clear role choice. Student login says **Email or MIS**. | Show student and faculty signup, a direct password recovery link, and the appropriate verification or invitation action. After submission, show the destination or masked address when appropriate, the next step and the available resend action. Expired links lead to the correct recovery flow. |
| Student home | **My courses**, a compact semester label, **Current / Archived**, then course rows. | Show course title, code, faculty and latest lecture. Make the title a course link and **Play latest** a separate link reachable by keyboard. If no lecture exists, keep **Open course** available. Group archived courses by term and label reference materials explicitly. |
| Topics, lectures and player | Course → topic → lecture breadcrumbs. On the player, put video and lecture title first. | Preserve the offering and archived/reference context through navigation and Back. Keep quality controls close to the video and discussion below it. Reflect the existing read-only rules in the available actions. |
| Faculty home and lectures | **Teaching**, with a row per offering showing its course, semester and section. | Provide **Upload lecture** and **View roster** on each eligible row. Keep **My lectures**, course requests and their review status easy to reach. Put profile editing under the account menu. |
| Faculty upload | The selected course and section, followed by topic, file and title. | Support the standalone upload entry as well as the course shortcut. Allow topic creation in context. Show transfer progress, then the server result. Keep recoverable input on failure and link to the published lecture on success. |
| Admin home and directories | Active year and term, requests awaiting review, then directory navigation. | Group Students and Faculty under People, Subjects and Semesters under Curriculum, and surface Assignments and Requests directly. Use searchable rows, meaningful status labels and persistent filters when returning from a detail view. Keep promotions, enrollment, reference access, profile and audit logs reachable. |
| Shared navigation and feedback | A compact desktop rail, mobile menu, page title and account controls. | Keep notifications accessible from the header. Use meaningful destination names such as **Courses** and **Assignments**. An unavailable page offers a route back to the signed-in role’s home. |

### First admin workflow to redesign

1. Open **Assignments → Assign faculty**. If no session exists, show year and term setup immediately. Explain that saving sets the term for the whole institution.
2. Show the saved academic year and allow only its active semesters. Choose the instructor, semester and section. Filter the course list to eligible subjects and clear incompatible selections when the semester changes.
3. Put a compact summary beside the submit action, for example **1 course · Semester 6 · Section A**. After a successful save, show the course and instructor in the assignment list.
4. Give each stop a distinct message. For an empty sixth-semester list, offer **Review subject catalogue**. For a duplicate assignment, identify the existing assignment. For a failed request, retain the selections and offer retry.

## 4. Interaction rules

- **Small screens.** Stack filters above results. In directories, put name and code on the first line, with section and status beneath. Put occasional row actions in a labeled menu. Use a full-height sheet for long forms, with a reachable submit button even when the keyboard is open.
- **Keyboard and touch.** Use native links, buttons and checkboxes. Give interactive controls a target of at least 44 × 44 px where practical. Support keyboard selection, visible focus, dialog focus containment, Escape and focus return. Honor reduced-motion preferences.
- **Waiting and recovery.** Show a loading state while data is pending. Distinguish an empty directory, an empty search result and a failed request. Announce submission results to assistive technology. Prevent repeat submissions while saving.
- **Language.** Use **course** consistently in the interface. Use **section** and **semester** whenever they distinguish two offerings. For a consequential action, name the affected record and explain the outcome before confirmation.

## 5. Implementation order

Each checkbox is a future implementation milestone. Review the named workflow before moving to the next group.

| Done | Phase | Starting points | Exit check |
| --- | --- | --- | --- |
| [ ] | 1 · Baseline and first design review | Capture the current student course list, faculty upload and admin assignment at 390 and 1440 px. Mock up the student home and the admin assignment form with realistic course names. | Compare both sizes side by side. Record baseline task time, actions and errors using the tasks below. Review the type, density and action hierarchy before applying them across the portal. |
| [ ] | 2 · Shared styles and navigation | Start with `Frontend/src/index.css`, `Frontend/src/theme.js`, `Frontend/tailwind.config.cjs`, `Frontend/index.html` and `Frontend/src/components/layout/`. Give CSS, Tailwind and MUI the same semantic color and typography values. | Buttons, inputs, tabs, dialogs, menus and status messages agree visually. Theme changes can be rolled out per screen. Desktop navigation and the mobile drawer pass keyboard and touch checks. |
| [ ] | 3 · Account access | Migrate `LoginPage`, `SignupPage` and `AccountLinkPage`, including success and recovery states. | A new student or faculty member can request verification, finish signup and sign in. Test existing-account confirmation, password reset, faculty invites and admin sign-in. |
| [ ] | 4 · Student learning | Migrate `StudentDashboard`, `TopicsPage`, `LecturesPage` and `LecturePlayerPage`. | Complete the student tasks below with current, archived and reference fixtures. Check the empty course and pending-enrollment views. |
| [ ] | 5 · Faculty teaching | Migrate `FacultyDashboard`, `UploadLecturePage`, `FacultyLecturesPage` and `FacultyProfilePage`. | Publish to the chosen section, open its roster, submit a course request and check its status. Test a failed upload and retry. |
| [ ] | 6 · Admin operations | Migrate `AdminDashboard`, `AdminProfilePage`, `AcademicSessionForm` and `ReferenceAudience`. Split large directory and dialog components by workflow as they move. | Complete initial session setup, assignment, review, enrollment and promotion. Confirm saved changes appear in the appropriate role’s view. |
| [ ] | 7 · Release review | Review notifications, empty/error pages, the fallback route and any remaining legacy styles. Run frontend lint/build and the existing portal checks. | Complete the task checks below, inspect 390, 768 and 1440 px layouts, and verify keyboard navigation and 200% zoom. Record issues with their route and reproduction steps. |

## 6. How to tell whether the redesign saves time

Use synthetic accounts and the same course, semester and section before and after the redesign. Time from a fully loaded starting screen to the visible result. Record user actions, elapsed time, wrong turns and requests for help. For email and large uploads, record delivery or transfer time separately. These are proposed acceptance targets; baseline measurements still need to be collected.

| Starting screen and task | Target for the redesigned flow |
| --- | --- |
| Student home → open the latest lecture for a named current course | One activation from the course row to its player. The learner can identify the title before opening it. |
| Student home → find a named archived course | Reach the course in at most three activations. Its semester and read-only context are visible. |
| Faculty home → upload for Section B of a course also taught in Section A | Open the correct upload form in one activation. The instructor chooses the course and section zero additional times. Verify the published result belongs to B. |
| Admin home → assign a course with a session already configured | Reach the assignment form in at most two activations. Complete on the first submission with an eligible course and see the saved row. Repeat with no session and verify setup returns to assignment. |
| Signup → know what to do after requesting verification | A first-time user can identify which inbox to check and how to request a fresh link. Complete the test on a phone-sized screen. |

The first review should pair two screens: a student course row with a real lecture title, and the sixth-semester faculty assignment form. Together they test whether the chosen visual style works for both reading and data entry.
