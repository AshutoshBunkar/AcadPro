import AcademicSessionForm from "../components/AcademicSessionForm";
import ReferenceAudience from "../components/ReferenceAudience";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "./admin.css";
import {
  GraduationCap,
  Users,
  Calendar,
  CheckCircle2,
  Search,
  Download,
  UserCheck,
  X,
  UserPlus,
  BookPlus,
  TrendingUp,
  Check,
  Trash2,
  Inbox,
  Clock,
  Edit2,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import {
  createFaculty,
  assignFacultyToSubject,
  removeTeachingAssignment,
  promoteStudent,
  getAdminDirectories,
  createSemester,
  deleteSemester,
  batchEnrollStudents,
  enrollStudentInSubjects,
  updateSubjectRequestStatus,
  updateStudent,
  deleteStudent,
  updateFaculty,
  deleteFaculty,
  updateSubject,
  deleteSubject,
} from "../api/admin";
import { createSubject } from "../api/subjects";

import {
  ACTIVE_ACADEMIC_YEAR,
  SEMESTER_OPTIONS,
} from "../constants";
import { getErrorMessage } from "../api/axios";

// ==========================================
// UNIFIED MODAL DIALOG WRAPPER
// ==========================================
function ModalWrapper({ open, onClose, title, subtitle, icon: Icon, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} aria-label={title} className="admin-dialog"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div>
        <div className="px-6 py-5 border-b border-nav-line flex items-center justify-between bg-nav-subtle/40">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-nav-accent/15 border border-nav-accent/30 flex items-center justify-center text-nav-accent">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-nav-ink tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-nav-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            aria-label="Close dialog" onClick={onClose}
            className="p-1.5 rounded-lg text-nav-muted hover:text-nav-ink hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}

// 1. Create Academic Semester Dialog
function CreateSemesterDialog({ open, onClose, directories }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    academicYear: directories?.currentSession?.academicYear || ACTIVE_ACADEMIC_YEAR,
    semesterNumber: 1,
    name: "",
    isCurrent: false,
    description: "",
  });

  const mutation = useMutation({
    mutationFn: () => createSemester({ ...form, semesterNumber: Number(form.semesterNumber) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={open}
      onClose={onClose}
      title="Create Academic Semester"
      subtitle="Define a new operational semester block for curriculum tracking"
      icon={Calendar}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Academic Year</label>
            <input aria-label="Academic year" required pattern="[0-9]{4}-[0-9]{4}"
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-nav-subtle border border-nav-line text-xs sm:text-sm text-nav-ink focus:outline-none focus:border-nav-accent"
             />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Target Semester</label>
            <select
              value={form.semesterNumber}
              onChange={(e) => setForm((f) => ({ ...f, semesterNumber: Number(e.target.value) }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-nav-subtle border border-nav-line text-xs sm:text-sm text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              {SEMESTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Display Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Autumn Semester 2025"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-nav-subtle border border-nav-line text-xs sm:text-sm text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Description (Optional)</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Curriculum session notes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-nav-subtle border border-nav-line text-xs sm:text-sm text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Creating..." : "Save Semester"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 2. Enroll Students Dialog
function EnrollStudentDialog({ open, onClose, directories }) {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0); // 0: Batch, 1: Individual

  // Batch Form
  const [batchForm, setBatchForm] = useState({
    department: "CSE",
    semester: 1,
    academicYear: directories?.currentSession?.academicYear || ACTIVE_ACADEMIC_YEAR,
  });

  // Individual Form
  const [indivForm, setIndivForm] = useState({
    studentId: "",
    subjectIds: [],
    academicYear: directories?.currentSession?.academicYear || ACTIVE_ACADEMIC_YEAR,
    semester: 1,
  });

  const studentsList = useMemo(() => directories?.students || [], [directories?.students]);
  const subjectsList = directories?.subjects || [];

  const batchMutation = useMutation({
    mutationFn: () =>
      batchEnrollStudents({
        department: batchForm.department,
        semester: Number(batchForm.semester),
        academicYear: batchForm.academicYear,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const indivMutation = useMutation({
    mutationFn: () =>
      enrollStudentInSubjects({
        ...indivForm,
        semester: Number(indivForm.semester),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const toggleSubjectSelect = (subId) => {
    setIndivForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(subId)
        ? f.subjectIds.filter((id) => id !== subId)
        : [...f.subjectIds, subId],
    }));
  };

  const handleClose = () => {
    batchMutation.reset();
    indivMutation.reset();
    onClose();
  };

  return (
    <ModalWrapper
      open={open}
      onClose={handleClose}
      title="Enroll Students into Courses"
      subtitle="Register students into semester subjects"
      icon={GraduationCap}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-nav-subtle rounded-xl border border-nav-line">
          <button
            type="button"
            onClick={() => setTabIndex(0)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tabIndex === 0
                ? "bg-nav-accent text-nav-canvas shadow-md shadow-nav-accent/20"
                : "text-nav-muted hover:text-nav-ink"
            }`}
          >
            Batch Departmental Enrollment
          </button>
          <button
            type="button"
            onClick={() => setTabIndex(1)}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tabIndex === 1
                ? "bg-nav-accent text-nav-canvas shadow-md shadow-nav-accent/20"
                : "text-nav-muted hover:text-nav-ink"
            }`}
          >
            Individual Student Mapping
          </button>
        </div>

        {tabIndex === 0 ? (
          <div className="space-y-3.5">
            <p className="text-xs text-nav-muted">
              Enrolls all eligible students in the selected department into matching semester subjects automatically.
            </p>

            {/* Department | Target Semester | Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
                <select
                  value={batchForm.department}
                  onChange={(e) => setBatchForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                >
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="ECE">Electronics (ECE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-nav-muted mb-1">Target Semester</label>
                <select
                  value={batchForm.semester}
                  onChange={(e) => setBatchForm((f) => ({ ...f, semester: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                >
                  {SEMESTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-nav-muted mb-1">Academic Year</label>
                <input aria-label="Academic year" required pattern="[0-9]{4}-[0-9]{4}"
                  value={batchForm.academicYear}
                  onChange={(e) => setBatchForm((f) => ({ ...f, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                 />
              </div>
            </div>

            {batchMutation.isError && (
              <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
                {getErrorMessage(batchMutation.error)}
              </div>
            )}
            {batchMutation.isSuccess && (
              <div role="status" className="p-3 rounded-xl bg-nav-success/15 border border-nav-success/30 text-nav-success-ink text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{batchMutation.data?.data?.message || batchMutation.data?.message || "Batch enrollment completed successfully."}</span>
                </div>
                {batchMutation.data?.data && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-nav-muted pt-1 border-t border-nav-success/20">
                    <span>Enrolled: <strong className="text-nav-success-ink">{batchMutation.data.data.successful ?? batchMutation.data.data.totalEnrollments ?? 0}</strong></span>
                    <span>Skipped (Already Enrolled): <strong className="text-nav-ink">{batchMutation.data.data.skipped ?? 0}</strong></span>
                    <span>Failed: <strong className="text-nav-danger-ink">{batchMutation.data.data.failed ?? 0}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-nav-muted mb-1">Select Student</label>
              <select
                value={indivForm.studentId}
                onChange={(e) => setIndivForm((f) => ({ ...f, studentId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
              >
                <option value="">-- Choose Student Candidate --</option>
                {studentsList.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name} ({st.mis || st.email}) • {st.department} Y{st.year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-nav-muted mb-1">Academic Year</label>
                <input aria-label="Academic year" required pattern="[0-9]{4}-[0-9]{4}"
                  value={indivForm.academicYear}
                  onChange={(e) => setIndivForm((f) => ({ ...f, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                 />
              </div>
              <div>
                <label className="block text-xs font-semibold text-nav-muted mb-1">Target Semester</label>
                <select
                  value={indivForm.semester}
                  onChange={(e) => setIndivForm((f) => ({ ...f, semester: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                >
                  {SEMESTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nav-muted mb-1">Select Subjects to Enroll</label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-nav-subtle/50 border border-nav-line rounded-xl">
                {subjectsList.map((sub) => {
                  const isChecked = indivForm.subjectIds.includes(sub._id);
                  return (
                    <label
                      key={sub._id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-nav-accent/15 border border-nav-accent/30 text-nav-accent"
                          : "hover:bg-white/5 text-nav-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSubjectSelect(sub._id)} />
                        <span className="font-semibold text-nav-ink">{sub.code}</span>
                        <span className="truncate max-w-[180px] text-nav-muted">{sub.name}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {indivMutation.isError && (
              <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
                {getErrorMessage(indivMutation.error)}
              </div>
            )}
            {indivMutation.isSuccess && (
              <div role="status" className="p-3 rounded-xl bg-nav-success/15 border border-nav-success/30 text-nav-success-ink text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Student enrolled in subjects successfully.</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Close
          </button>
          {tabIndex === 0 ? (
            <button
              type="button"
              onClick={() => batchMutation.mutate()}
              disabled={batchMutation.isPending || !batchForm.department || !batchForm.academicYear}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20 disabled:opacity-50"
            >
              {batchMutation.isPending ? "Processing..." : "Run Batch Enrollment"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => indivMutation.mutate()}
              disabled={
                indivMutation.isPending ||
                !indivForm.studentId ||
                indivForm.subjectIds.length === 0 ||
                !indivForm.academicYear
              }
              className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20 disabled:opacity-50"
            >
              {indivMutation.isPending ? "Enrolling..." : "Enroll Student"}
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

// 3. Assign Faculty Dialog
function AssignFacultyDialog({ onClose, directories, onSaved, onCatalogue }) {
  const queryClient = useQueryClient();
  const { currentSession } = directories;
  const semesters = SEMESTER_OPTIONS.filter((option) => currentSession.activeSemesters.includes(option.value));
  const [form, setForm] = useState({
    facultyId: "",
    subjectIds: [],
    semester: semesters[0]?.value,
    section: "A",
    department: "CSE",
    program: "B.Tech",
  });
  const [subjectSearch, setSubjectSearch] = useState("");

  const facultyList = directories.faculty || [];

  const filteredSubjects = useMemo(() => {
    const list = directories.subjects || [];
    const q = subjectSearch.toLowerCase().trim();
    return list.filter((sub) => {
      if (sub.allowedSemesters?.length && !sub.allowedSemesters.includes(form.semester)) return false;
      if (!q) return true;
      return (
        sub.name?.toLowerCase().includes(q) ||
        sub.code?.toLowerCase().includes(q) ||
        sub.department?.toLowerCase().includes(q)
      );
    });
  }, [directories.subjects, subjectSearch, form.semester]);

  const toggleSubjectSelect = (subId) => {
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(subId)
        ? f.subjectIds.filter((id) => id !== subId)
        : [...f.subjectIds, subId],
    }));
  };

  const selectAllFiltered = () => {
    const ids = filteredSubjects.map((s) => s._id);
    setForm((f) => ({
      ...f,
      subjectIds: Array.from(new Set([...f.subjectIds, ...ids])),
    }));
  };

  const clearSelected = () => {
    setForm((f) => ({ ...f, subjectIds: [] }));
  };

  const mutation = useMutation({
    mutationFn: () =>
      assignFacultyToSubject({
        facultyId: form.facultyId,
        subjectIds: form.subjectIds,
        academicYear: currentSession.academicYear,
        semester: Number(form.semester),
        section: form.section || "A",
        department: form.department || "CSE",
        program: form.program || "B.Tech",
      }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      const saved = response.data.data;
      onSaved(form, Array.isArray(saved) ? saved.length : 1);
    },
  });

  return (
    <ModalWrapper
      open
      onClose={onClose}
      title="Assign Faculty to Course Offerings"
      subtitle="Map instructor to one or more semester course offerings"
      icon={UserCheck}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">
            Select Faculty Member <span className="text-nav-accent">*</span>
          </label>
          <select
            required
            aria-label="Faculty member" value={form.facultyId}
            onChange={(e) => {
              const fac = facultyList.find((f) => f._id === e.target.value);
              setForm((f) => ({
                ...f,
                facultyId: e.target.value,
                department: fac?.department || f.department,
              }));
            }}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          >
            <option value="">-- Choose Instructor --</option>
            {facultyList.map((fac) => (
              <option key={fac._id} value={fac._id}>
                {fac.name} ({fac.department || "Faculty"}) • {fac.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">
              Academic Year <span className="text-nav-accent">*</span>
            </label>
            <input aria-label="Academic year" readOnly value={currentSession.academicYear}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
             />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">
              Target Semester <span className="text-nav-accent">*</span>
            </label>
            <select
              aria-label="Target semester"
              value={form.semester}
              onChange={(e) => {
                mutation.reset();
                setForm((f) => ({ ...f, semester: Number(e.target.value), subjectIds: [] }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              {semesters.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Section</label>
            <input
              type="text"
              aria-label="Section" value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value.toUpperCase() }))}
              placeholder="e.g. A"
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              aria-label="Department" value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Program</label>
            <select
              aria-label="Program" value={form.program}
              onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-nav-muted">
              Select Courses to Assign ({form.subjectIds.length} selected){" "}
              <span className="text-nav-accent">*</span>
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-nav-accent hover:underline"
              >
                Select All
              </button>
              <span className="text-nav-line">•</span>
              <button
                type="button"
                onClick={clearSelected}
                className="text-nav-muted hover:text-nav-ink"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-nav-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Filter course catalogue" placeholder="Filter course catalogue..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-nav-subtle/50 border border-nav-line rounded-xl">
            {filteredSubjects.map((sub) => {
              const isChecked = form.subjectIds.includes(sub._id);
              return (
                <label
                  key={sub._id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-nav-accent/15 border border-nav-accent/30 text-nav-accent"
                      : "hover:bg-white/5 text-nav-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleSubjectSelect(sub._id)} />
                    <span className="font-semibold text-nav-ink">{sub.code}</span>
                    <span className="truncate max-w-[220px] text-nav-muted">{sub.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-nav-subtle border border-nav-line text-nav-muted shrink-0">
                    {sub.department}
                  </span>
                </label>
              );
            })}
            {filteredSubjects.length === 0 && (
              <p className="text-center py-4 text-xs text-nav-muted">{subjectSearch.trim() ? "No matching courses for this semester." : "No courses in the catalogue are offered in this semester."}</p>
            )}
          </div>
        </div>

        {filteredSubjects.length === 0 && !subjectSearch.trim() && <button type="button" onClick={onCatalogue} className="underline">Review course catalogue</button>}
        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}
        <p className="text-sm">{form.subjectIds.length} selected · Semester {form.semester} · Section {form.section.trim() || "A"}</p>
        <div className="admin-submit flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.facultyId || form.subjectIds.length === 0}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20 disabled:opacity-50"
          >
            {mutation.isPending ? "Assigning..." : `Assign Faculty (${form.subjectIds.length})`}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 4. Create Subject Dialog
function CreateSubjectDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    code: "",
    department: "CSE",
    semester: 1,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createSubject({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        department: form.department,
        semester: Number(form.semester),
        year: Math.ceil(Number(form.semester) / 2),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={open}
      onClose={onClose}
      title="Create New Subject"
      subtitle="Add a new academic course to the institutional catalogue"
      icon={BookPlus}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Subject Code</label>
            <input
              type="text"
              required
              placeholder="e.g. CS302"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Subject Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Computer Networks & Protocols"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Curriculum Semester</label>
          <select
            value={form.semester}
            onChange={(e) => setForm((f) => ({ ...f, semester: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          >
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} (Year {s.year})
              </option>
            ))}
          </select>
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Creating..." : "Create Subject"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 5. Create Faculty Dialog
function CreateFacultyDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "CSE",
    designation: "Assistant Professor",
  });

  const mutation = useMutation({
    mutationFn: () => createFaculty(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={open}
      onClose={onClose}
      title="Create Faculty Account"
      subtitle="Provision an instructor account with course upload privileges"
      icon={UserPlus}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Faculty Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Dr. Alan Turing"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Email</label>
          <input
            type="email"
            required
            placeholder="instructor@acadpro.edu"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <p className="text-sm text-nav-muted">The instructor will receive an email invitation to choose their password.</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Creating..." : "Create Account"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 6. Promote Student Dialog
function PromoteStudentDialog({ open, onClose, directories }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ studentId: "", newYear: 2, newSemester: 3 });
  const studentsList = useMemo(() => directories?.students || [], [directories?.students]);

  const selectedStudent = useMemo(() => {
    return studentsList.find((s) => s._id === form.studentId);
  }, [studentsList, form.studentId]);

  const handleStudentSelect = (stId) => {
    const st = studentsList.find((s) => s._id === stId);
    if (st) {
      const currentSem = st.currentSemester || ((st.year - 1) * 2 + 1);
      const nextSem = directories?.currentSession?.activeSemesters?.find(n => n > currentSem) || Math.min(currentSem + 1, 8);
      const nextYear = Math.ceil(nextSem / 2);
      setForm({
        studentId: stId,
        newYear: nextYear,
        newSemester: nextSem,
      });
    } else {
      setForm((f) => ({ ...f, studentId: stId }));
    }
  };

  const preview = useQuery({
    queryKey: ["promotion-preview", form],
    queryFn: () => promoteStudent({ ...form, preview: true }).then(r => r.data.data),
    enabled: open && Boolean(form.studentId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () =>
      promoteStudent({
        studentId: form.studentId,
        newYear: Number(form.newYear),
        newSemester: Number(form.newSemester),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });

  return (
    <ModalWrapper
      open={open}
      onClose={onClose}
      title="Promote Student Academic Year"
      subtitle="Advance academic placement and automatically synchronize course enrollments"
      icon={TrendingUp}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (preview.isSuccess) mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Select Student</label>
          <select
            required
            aria-label="Select student" value={form.studentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          >
            <option value="">-- Choose Student --</option>
            {studentsList.map((st) => (
              <option key={st._id} value={st._id}>
                {st.name} ({st.mis || st.email}) • Currently Year {st.year} (Sem {st.currentSemester || (st.year - 1) * 2 + 1}) • {st.department}
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <div className="p-3 rounded-xl bg-nav-subtle/60 border border-nav-line text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-nav-muted">Current Placement:</span>
              <span className="font-semibold text-nav-ink">
                Year {selectedStudent.year} • Semester {selectedStudent.currentSemester || (selectedStudent.year - 1) * 2 + 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-nav-muted">Department & Program:</span>
              <span className="font-mono text-nav-accent">
                {selectedStudent.department} (B.Tech)
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">
            Target Progression Semester <span className="text-nav-accent">*</span>
          </label>
          <select
            aria-label="Target semester" value={form.newSemester}
            onChange={(e) => {
              const sem = Number(e.target.value);
              setForm((f) => ({
                ...f,
                newSemester: sem,
                newYear: Math.ceil(sem / 2),
              }));
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
              const currentSem = selectedStudent
                ? selectedStudent.currentSemester || ((selectedStudent.year - 1) * 2 + 1)
                : 1;
              const isPastOrCurrent = sem <= currentSem;
              return (
                <option
                  key={sem}
                  value={sem}
                  disabled={Boolean(selectedStudent && isPastOrCurrent)}
                >
                  Semester {sem} (Year {Math.ceil(sem / 2)}) {sem === currentSem ? "— Current Placement" : sem < currentSem ? "— Prior Completed" : ""}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-nav-muted mt-1">
            Target Year: <span className="font-semibold text-nav-accent">Year {form.newYear}</span> (Semester {form.newSemester})
          </p>
        </div>

        {preview.data && <p role="status" className="text-sm text-nav-accent">
          Archive {preview.data.transitionedOldEnrollments} enrollments. Add {preview.data.enrollments.created}.
          Courses: {preview.data.enrollments.courses.map(c => c.code).join(", ")}.
        </p>}
        {preview.isError && <p role="alert">{getErrorMessage(preview.error)}</p>}
        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}
        {mutation.isSuccess && (
          <div role="status" className="p-3 rounded-xl bg-nav-success/15 border border-nav-success/30 text-nav-success-ink text-xs space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">Student promoted & courses synchronized!</span>
            </div>
            {mutation.data?.data?.enrollments?.courses?.length > 0 && (
              <p className="text-[11px] text-nav-muted">
                Assigned courses: {mutation.data.data.enrollments.courses.map((c) => c.code).join(", ")}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !preview.isSuccess}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20 cursor-pointer disabled:opacity-40"
          >
            {mutation.isPending ? "Promoting & Enrolling..." : "Promote Student"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 7. Edit Student Dialog (Admin)
function EditStudentDialog({ student, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: student?.name || "",
    mis: student?.mis || "",
    email: student?.email || "",
    department: student?.department || "CSE",
    year: student?.year || 1,
    currentSemester: student?.currentSemester || 1,
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        mis: form.mis.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        year: Number(form.year),
        currentSemester: Number(form.currentSemester),
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      return updateStudent(student._id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={Boolean(student)}
      onClose={onClose}
      title="Edit Student Record"
      subtitle={`Modify profile details and enrollment attributes for ${student?.name || "Student"}`}
      icon={GraduationCap}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Full Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">MIS / ID</label>
            <input
              type="text"
              required
              value={form.mis}
              onChange={(e) => setForm((f) => ({ ...f, mis: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs font-mono text-nav-accent focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Academic Year</label>
            <select
              value={form.year}
              onChange={(e) => {
                const y = Number(e.target.value);
                setForm((f) => ({
                  ...f,
                  year: y,
                  currentSemester: (y - 1) * 2 + 1,
                }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              {[1, 2, 3, 4].map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Current Semester</label>
            <select
              value={form.currentSemester}
              onChange={(e) => {
                const s = Number(e.target.value);
                setForm((f) => ({
                  ...f,
                  currentSemester: s,
                  year: Math.ceil(s / 2),
                }));
              }}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">
            Reset Password <span className="text-[10px] text-nav-muted font-normal">(Leave blank to keep unchanged)</span>
          </label>
          <input
            type="password"
            placeholder="Min 6 characters to reset"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Saving Changes..." : "Save Student"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 8. Edit Faculty Dialog (Admin)
function EditFacultyDialog({ faculty, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: faculty?.name || "",
    email: faculty?.email || "",
    department: faculty?.department || "CSE",
    designation: faculty?.designation || "Assistant Professor",
    specialization: faculty?.specialization || "",
    phone: faculty?.phone || "",
    officeLocation: faculty?.officeLocation || "",
    officeHours: faculty?.officeHours || "",
    avatar: faculty?.avatar || "",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        specialization: form.specialization.trim(),
        phone: form.phone.trim(),
        officeLocation: form.officeLocation.trim(),
        officeHours: form.officeHours.trim(),
        avatar: form.avatar.trim(),
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      return updateFaculty(faculty._id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={Boolean(faculty)}
      onClose={onClose}
      title="Edit Faculty Member"
      subtitle={`Update academic profile, office hours, and credentials for ${faculty?.name || "Faculty"}`}
      icon={Users}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Faculty Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Email Address</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Designation</label>
            <input
              type="text"
              value={form.designation}
              onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Specialization</label>
            <input
              type="text"
              placeholder="e.g. Machine Learning, VLSI"
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="+91 (020) ..."
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Office Location</label>
            <input
              type="text"
              placeholder="e.g. Block B, Room 304"
              value={form.officeLocation}
              onChange={(e) => setForm((f) => ({ ...f, officeLocation: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Office Hours</label>
            <input
              type="text"
              placeholder="e.g. Mon/Wed 2-4 PM"
              value={form.officeHours}
              onChange={(e) => setForm((f) => ({ ...f, officeHours: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Avatar Picture URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.avatar}
            onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">
            Reset Password <span className="text-[10px] text-nav-muted font-normal">(Leave blank to keep unchanged)</span>
          </label>
          <input
            type="password"
            placeholder="Min 6 characters to reset"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Saving Changes..." : "Save Faculty"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 9. Edit Subject Dialog (Admin)
function EditSubjectDialog({ subject, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: subject?.name || "",
    code: subject?.code || "",
    department: subject?.department || "CSE",
    year: subject?.year || 1,
    semester:
      subject?.allowedSemesters && subject.allowedSemesters.length > 0
        ? subject.allowedSemesters[0]
        : (subject?.year || 1) * 2 - 1,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const semNum = Number(form.semester);
      return updateSubject(subject._id, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        department: form.department.trim(),
        year: Math.ceil(semNum / 2),
        semester: semNum,
        allowedSemesters: [semNum],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      onClose();
    },
  });

  return (
    <ModalWrapper
      open={Boolean(subject)}
      onClose={onClose}
      title="Edit Curriculum Subject"
      subtitle={`Modify course catalog details for ${subject?.code} - ${subject?.name}`}
      icon={BookPlus}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3.5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Subject Code</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs font-mono text-nav-accent uppercase focus:outline-none focus:border-nav-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nav-muted mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
            >
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Subject Title</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-nav-muted mb-1">Curriculum Semester</label>
          <select
            value={form.semester}
            onChange={(e) => setForm((f) => ({ ...f, semester: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
          >
            {SEMESTER_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} (Year {s.year})
              </option>
            ))}
          </select>
        </div>

        {mutation.isError && (
          <div role="alert" className="p-3 rounded-xl bg-nav-danger/15 border border-nav-danger/30 text-nav-danger-ink text-xs">
            {getErrorMessage(mutation.error)}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-nav-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-nav-muted hover:text-nav-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-nav-accent hover:bg-nav-accent-hover text-nav-canvas shadow-md shadow-nav-accent/20"
          >
            {mutation.isPending ? "Saving Changes..." : "Save Subject"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// ==========================================
// MAIN ADMIN DASHBOARD COMPONENT
// ==========================================
export default function AdminDashboard() {
  const [openDialog, setOpenDialog] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [activeDirectoryTab, setActiveDirectoryTab] = useState("semesters");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [allocationFacultyFilter, setAllocationFacultyFilter] = useState("ALL");
  const [allocationSemesterFilter, setAllocationSemesterFilter] = useState("ALL");
  const [allocationYearFilter, setAllocationYearFilter] = useState("ALL");

  const queryClient = useQueryClient();

  const directoriesQuery = useQuery({
    queryKey: ["admin-directories"],
    queryFn: getAdminDirectories,
    select: (res) => res.data.data,
  });

  const directories = directoriesQuery.data || {
    faculty: [],
    subjects: [],
    students: [],
    assignments: [],
    semesters: [],
    subjectRequests: [],
  };

  const semestersList = useMemo(() => directories.semesters || [], [directories.semesters]);
  const subjectsList = useMemo(() => directories.subjects || [], [directories.subjects]);
  const facultyList = useMemo(() => directories.faculty || [], [directories.faculty]);
  const studentsList = useMemo(() => directories.students || [], [directories.students]);
  const assignmentsList = useMemo(() => directories.assignments || [], [directories.assignments]);
  const subjectRequestsList = useMemo(
    () => directories.subjectRequests || [],
    [directories.subjectRequests]
  );

  const allocationYearsList = useMemo(() => {
    const years = new Set(assignmentsList.map((a) => a.academicYear).filter(Boolean));
    return Array.from(years);
  }, [assignmentsList]);

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => removeTeachingAssignment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const deleteSemesterMutation = useMutation({
    mutationFn: ({ id, cascade }) => deleteSemester(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      queryClient.invalidateQueries({ queryKey: ["semesters"] });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id) => deleteStudent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const deleteFacultyMutation = useMutation({
    mutationFn: (id) => deleteFaculty(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id) => deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
  });

  const updateSubjectRequestMutation = useMutation({
    mutationFn: ({ id, status, adminRemarks }) =>
      updateSubjectRequestStatus(id, { status, adminRemarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-directories"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });


  // Filtered Directory Data
  const filteredSemesters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return semestersList.filter(
      (s) =>
        !q ||
        s.academicYear?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        `semester ${s.semesterNumber}`.includes(q)
    );
  }, [semestersList, searchQuery]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return subjectsList.filter((sub) => {
      const matchDept = departmentFilter === "ALL" || sub.department === departmentFilter;
      const matchText =
        !q ||
        sub.name?.toLowerCase().includes(q) ||
        sub.code?.toLowerCase().includes(q) ||
        sub.department?.toLowerCase().includes(q);
      return matchDept && matchText;
    });
  }, [subjectsList, searchQuery, departmentFilter]);

  const filteredFaculty = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return facultyList.filter(
      (f) =>
        !q ||
        f.name?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.designation?.toLowerCase().includes(q)
    );
  }, [facultyList, searchQuery]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return studentsList.filter((st) => {
      const matchDept = departmentFilter === "ALL" || st.department === departmentFilter;
      const matchText =
        !q ||
        st.name?.toLowerCase().includes(q) ||
        st.email?.toLowerCase().includes(q) ||
        st.mis?.toLowerCase().includes(q);
      return matchDept && matchText;
    });
  }, [studentsList, searchQuery, departmentFilter]);

  const filteredAssignments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assignmentsList.filter((a) => {
      const facId = a.facultyId?._id || a.facultyId;
      const facName = a.facultyId?.name || "";
      const subName = a.subjectId?.name || "";
      const subCode = a.subjectId?.code || "";
      const sec = a.section || "";

      const matchFaculty =
        allocationFacultyFilter === "ALL" || facId === allocationFacultyFilter;
      const matchSemester =
        allocationSemesterFilter === "ALL" ||
        String(a.semester) === String(allocationSemesterFilter);
      const matchYear =
        allocationYearFilter === "ALL" || a.academicYear === allocationYearFilter;
      const matchText =
        !q ||
        facName.toLowerCase().includes(q) ||
        subName.toLowerCase().includes(q) ||
        subCode.toLowerCase().includes(q) ||
        sec.toLowerCase().includes(q);

      return matchFaculty && matchSemester && matchYear && matchText;
    });
  }, [
    assignmentsList,
    searchQuery,
    allocationFacultyFilter,
    allocationSemesterFilter,
    allocationYearFilter,
  ]);

  const filteredSubjectRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return subjectRequestsList.filter((r) => {
      const facName = r.facultyId?.name || "";
      const facEmail = r.facultyId?.email || "";
      const matchText =
        !q ||
        r.code?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        facName.toLowerCase().includes(q) ||
        facEmail.toLowerCase().includes(q);
      const matchDept = departmentFilter === "ALL" || r.department === departmentFilter;
      return matchText && matchDept;
    });
  }, [subjectRequestsList, searchQuery, departmentFilter]);


  const [assignmentNotice, setAssignmentNotice] = useState("");
  const directoryRef = useRef(null);
  const showDirectory = (tab) => {
    setActiveDirectoryTab(tab);
    setSearchQuery("");
    setDepartmentFilter("ALL");
    setOpenDialog(null);
    requestAnimationFrame(() => directoryRef.current?.focus());
  };

  // JSON Export Handler
  const handleExportDirectory = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      institution: "AcadPro Central Administration",
      totalSemesters: semestersList.length,
      totalSubjects: subjectsList.length,
      totalFaculty: facultyList.length,
      totalStudents: studentsList.length,
      directories,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acadpro-directory-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout
      title="Administration"
      subtitle="Campus directory, course allocations, student promotions & operational semesters"
      fullWidth
    >
      <div className="admin-workspace space-y-6">
        <section className="admin-overview">
          <h1>Academic administration</h1>
          <p>{directoriesQuery.isPending ? "Loading academic session…" : directoriesQuery.isError ? "Academic session unavailable" : directories.currentSession ? directories.currentSession.academicYear + " · " + directories.currentSession.termName : "Academic session awaits setup"}</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setOpenDialog("assign")}>Assign faculty</button>
            <button onClick={() => showDirectory("requests")}>Review requests{directoriesQuery.data && " (" + subjectRequestsList.filter(r => r.status === "pending").length + " pending)"}</button>
          </div>
        </section>
        {/* Quick Operations Action Bar */}
        <div className="p-5 rounded-2xl bg-nav-surface border border-nav-line shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-nav-ink">
                Directory actions
              </h3>
              <p className="text-xs text-nav-muted">
                Manage courses, enrollments and people
              </p>
            </div>
            <button
              onClick={handleExportDirectory}
              className="px-3.5 py-1.5 rounded-xl bg-nav-subtle hover:bg-nav-subtle text-nav-ink border border-nav-line text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-nav-accent" />
              <span>Export JSON Directory</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setOpenDialog("semester")}
              className="p-3 rounded-xl bg-nav-subtle/60 hover:bg-nav-subtle border border-nav-line hover:border-nav-accent/40 text-left transition-all cursor-pointer group"
            >
              <Calendar className="w-4 h-4 text-nav-accent mb-2" />
              <p className="text-xs font-bold text-nav-ink group-hover:text-nav-accent transition-colors">
                New Semester
              </p>
              <p className="text-[10px] text-nav-muted">Create block</p>
            </button>

            <button
              onClick={() => setOpenDialog("enroll")}
              className="p-3 rounded-xl bg-nav-subtle/60 hover:bg-nav-subtle border border-nav-line hover:border-nav-accent/40 text-left transition-all cursor-pointer group"
            >
              <GraduationCap className="w-4 h-4 text-nav-accent mb-2" />
              <p className="text-xs font-bold text-nav-ink group-hover:text-nav-accent transition-colors">
                Enroll Students
              </p>
              <p className="text-[10px] text-nav-muted">Batch / Individual</p>
            </button>

            <button
              onClick={() => setOpenDialog("subject")}
              className="p-3 rounded-xl bg-nav-subtle/60 hover:bg-nav-subtle border border-nav-line hover:border-nav-accent/40 text-left transition-all cursor-pointer group"
            >
              <BookPlus className="w-4 h-4 text-nav-accent mb-2" />
              <p className="text-xs font-bold text-nav-ink group-hover:text-nav-accent transition-colors">
                New Subject
              </p>
              <p className="text-[10px] text-nav-muted">Add to catalogue</p>
            </button>

            <button
              onClick={() => setOpenDialog("faculty")}
              className="p-3 rounded-xl bg-nav-subtle/60 hover:bg-nav-subtle border border-nav-line hover:border-nav-accent/40 text-left transition-all cursor-pointer group"
            >
              <UserPlus className="w-4 h-4 text-nav-accent mb-2" />
              <p className="text-xs font-bold text-nav-ink group-hover:text-nav-accent transition-colors">
                Create Faculty
              </p>
              <p className="text-[10px] text-nav-muted">Provision login</p>
            </button>

            <button
              onClick={() => setOpenDialog("promote")}
              className="p-3 rounded-xl bg-nav-subtle/60 hover:bg-nav-subtle border border-nav-line hover:border-nav-accent/40 text-left transition-all cursor-pointer group"
            >
              <TrendingUp className="w-4 h-4 text-nav-accent mb-2" />
              <p className="text-xs font-bold text-nav-ink group-hover:text-nav-accent transition-colors">
                Promote Student
              </p>
              <p className="text-[10px] text-nav-muted">Next year standing</p>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DIRECTORY EXPLORER TABLES */}
        {/* ============================================================== */}
        <div ref={directoryRef} tabIndex={-1} aria-label="Academic directory" className="p-5 sm:p-6 rounded-2xl bg-nav-surface border border-nav-line shadow-2xl space-y-5">
          {activeDirectoryTab === "assignments" && assignmentNotice && <p role="status" className="text-sm font-semibold">{assignmentNotice}</p>}
          {/* Table Header & Directory Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-nav-line">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-nav-subtle border border-nav-line">
              <button
                onClick={() => setActiveDirectoryTab("semesters")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDirectoryTab === "semesters"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                Semesters ({semestersList.length})
              </button>
              <button
                onClick={() => setActiveDirectoryTab("subjects")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDirectoryTab === "subjects"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                Subjects ({subjectsList.length})
              </button>
              <button
                onClick={() => setActiveDirectoryTab("faculty")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDirectoryTab === "faculty"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                Faculty ({facultyList.length})
              </button>
              <button
                onClick={() => setActiveDirectoryTab("students")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDirectoryTab === "students"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                Students ({studentsList.length})
              </button>
              <button
                onClick={() => setActiveDirectoryTab("assignments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeDirectoryTab === "assignments"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                Assignments ({assignmentsList.length})
              </button>
              <button
                onClick={() => setActiveDirectoryTab("requests")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeDirectoryTab === "requests"
                    ? "bg-nav-accent text-nav-canvas shadow-sm"
                    : "text-nav-muted hover:text-nav-ink"
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>Course Requests</span>
                {subjectRequestsList.filter((r) => r.status === "pending").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-nav-accent text-nav-canvas">
                    {subjectRequestsList.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </button>
            </div>


            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-nav-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                />
              </div>

              {(activeDirectoryTab === "subjects" || activeDirectoryTab === "students") && (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                >
                  <option value="ALL">All Depts</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                </select>
              )}

              {activeDirectoryTab === "assignments" && (
                <div className="flex items-center gap-2">
                  <select
                    value={allocationFacultyFilter}
                    onChange={(e) => setAllocationFacultyFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent max-w-[140px] truncate"
                  >
                    <option value="ALL">All Instructors</option>
                    {facultyList.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={allocationSemesterFilter}
                    onChange={(e) => setAllocationSemesterFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                  >
                    <option value="ALL">All Semesters</option>
                    {SEMESTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {allocationYearsList.length > 0 && (
                    <select
                      value={allocationYearFilter}
                      onChange={(e) => setAllocationYearFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-nav-subtle border border-nav-line text-xs text-nav-ink focus:outline-none focus:border-nav-accent"
                    >
                      <option value="ALL">All Terms</option>
                      {allocationYearsList.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Table: Semesters */}
          {activeDirectoryTab === "semesters" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Academic Year</th>
                    <th className="py-3 px-4 font-bold">Semester</th>
                    <th className="py-3 px-4 font-bold">Display Title</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredSemesters.map((s) => (
                    <tr key={s._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-nav-ink">{s.academicYear}</td>
                      <td className="py-3 px-4 text-nav-accent font-mono">Semester {s.semesterNumber}</td>
                      <td className="py-3 px-4 text-nav-ink">{s.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nav-success/15 text-nav-success border border-nav-success/30">
                          {s.status || "Active Session"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete ${s.name || `Semester ${s.semesterNumber}`} (${s.academicYear})? If it contains active course allocations or student enrollments, this will clear them as well.`
                              )
                            ) {
                              deleteSemesterMutation.mutate({ id: s._id, cascade: true });
                            }
                          }}
                          disabled={deleteSemesterMutation.isPending}
                          className="p-1.5 rounded-lg text-nav-danger-ink hover:bg-nav-danger/15 border border-nav-danger/20 hover:border-nav-danger/40 transition-colors cursor-pointer"
                          title="Delete Semester"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSemesters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-nav-muted">
                        No semesters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Subjects */}
          {activeDirectoryTab === "subjects" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Code</th>
                    <th className="py-3 px-4 font-bold">Subject Title</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold">Curriculum Semester</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredSubjects.map((sub) => (
                    <tr key={sub._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-nav-accent">{sub.code}</td>
                      <td className="py-3 px-4 font-semibold text-nav-ink">{sub.name}</td>
                      <td className="py-3 px-4 text-nav-muted">{sub.department}</td>
                      <td className="py-3 px-4 text-nav-muted">
                        {sub.allowedSemesters && sub.allowedSemesters.length > 0
                          ? sub.allowedSemesters.map((s) => `Sem ${s}`).join(", ")
                          : `Year ${sub.year}`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSubject(sub)}
                            className="px-2 py-1 rounded-lg bg-nav-accent/15 hover:bg-nav-accent/25 text-nav-accent border border-nav-accent/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to permanently delete subject ${sub.code} - ${sub.name}? This will remove all associated curriculum modules, video lectures, and student enrollments.`
                                )
                              ) {
                                deleteSubjectMutation.mutate(sub._id);
                              }
                            }}
                            disabled={deleteSubjectMutation.isPending}
                            className="p-1.5 rounded-lg text-nav-danger-ink hover:bg-nav-danger/15 border border-nav-danger/20 hover:border-nav-danger/40 transition-colors cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSubjects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-nav-muted">
                        No subjects match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Faculty */}
          {activeDirectoryTab === "faculty" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Faculty Name</th>
                    <th className="py-3 px-4 font-bold">Email</th>
                    <th className="py-3 px-4 font-bold">Designation</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredFaculty.map((f) => (
                    <tr key={f._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-nav-ink">{f.name}</td>
                      <td className="py-3 px-4 text-nav-accent font-mono">{f.email}</td>
                      <td className="py-3 px-4 text-nav-muted">{f.designation || "Professor"}</td>
                      <td className="py-3 px-4 text-nav-muted">{f.department || "CSE"}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingFaculty(f)}
                            className="px-2 py-1 rounded-lg bg-nav-accent/15 hover:bg-nav-accent/25 text-nav-accent border border-nav-accent/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Faculty"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to permanently delete faculty member ${f.name} (${f.email})? This will deallocate all courses and clean up uploaded media.`
                                )
                              ) {
                                deleteFacultyMutation.mutate(f._id);
                              }
                            }}
                            disabled={deleteFacultyMutation.isPending}
                            className="p-1.5 rounded-lg text-nav-danger-ink hover:bg-nav-danger/15 border border-nav-danger/20 hover:border-nav-danger/40 transition-colors cursor-pointer"
                            title="Delete Faculty"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFaculty.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-nav-muted">
                        No faculty found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Students */}
          {activeDirectoryTab === "students" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Student Name</th>
                    <th className="py-3 px-4 font-bold">MIS / ID</th>
                    <th className="py-3 px-4 font-bold">Email</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold">Year</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredStudents.map((st) => (
                    <tr key={st._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-semibold text-nav-ink">{st.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-nav-accent">{st.mis || "—"}</td>
                      <td className="py-3 px-4 text-nav-muted">{st.email}</td>
                      <td className="py-3 px-4 text-nav-muted">{st.department}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-nav-subtle text-nav-ink border border-nav-line">
                          Year {st.year}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingStudent(st)}
                            className="px-2 py-1 rounded-lg bg-nav-accent/15 hover:bg-nav-accent/25 text-nav-accent border border-nav-accent/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Edit Student"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to permanently delete student ${st.name} (${st.mis || st.email})? This will cancel all course enrollments.`
                                )
                              ) {
                                deleteStudentMutation.mutate(st._id);
                              }
                            }}
                            disabled={deleteStudentMutation.isPending}
                            className="p-1.5 rounded-lg text-nav-danger-ink hover:bg-nav-danger/15 border border-nav-danger/20 hover:border-nav-danger/40 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-nav-muted">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Allocations */}
          {activeDirectoryTab === "assignments" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Assigned Faculty</th>
                    <th className="py-3 px-4 font-bold">Course Offering</th>
                    <th className="py-3 px-4 font-bold">Academic Term</th>
                    <th className="py-3 px-4 font-bold">Enrolled Scholars</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredAssignments.map((a) => (
                    <tr key={a._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-nav-ink">
                          {a.facultyId?.name || "Faculty Member"}
                        </div>
                        {a.facultyId?.email && (
                          <div className="text-[11px] text-nav-muted font-mono">
                            {a.facultyId.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-nav-accent font-bold">
                            {a.subjectId?.code}
                          </span>
                          <span className="text-nav-ink">{a.subjectId?.name}</span>
                        </div>
                        <div className="text-[10px] text-nav-muted mt-0.5">
                          {a.subjectId?.department || a.department || "CSE"} • {a.program || "B.Tech"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-nav-ink font-medium">{a.academicYear}</div>
                        <div className="text-nav-accent font-mono text-[11px]">
                          Semester {a.semester} • Sec {a.section || "A"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-nav-accent/10 text-nav-accent border border-nav-accent/25">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{a.enrolledCount ?? 0} Scholars</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nav-success/15 text-nav-success border border-nav-success/30">
                          Active Allocation
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const facName = a.facultyId?.name || "Faculty Member";
                            const subCode = a.subjectId?.code || "Course";
                            if (
                              window.confirm(
                                `Are you sure you want to unassign ${facName} from ${subCode} (Sem ${a.semester}, AY ${a.academicYear})?`
                              )
                            ) {
                              deleteAssignmentMutation.mutate(a._id);
                            }
                          }}
                          disabled={deleteAssignmentMutation.isPending}
                          className="p-1.5 rounded-lg text-nav-danger-ink hover:bg-nav-danger/15 border border-nav-danger/20 hover:border-nav-danger/40 transition-colors cursor-pointer"
                          title="Remove Teaching Assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-nav-muted">
                        No allocations match the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table: Course Requests from Faculty */}
          {activeDirectoryTab === "requests" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-nav-line text-nav-muted uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-bold">Course Requested</th>
                    <th className="py-3 px-4 font-bold">Term & Section</th>
                    <th className="py-3 px-4 font-bold">Department</th>
                    <th className="py-3 px-4 font-bold">Requested By</th>
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nav-line/50">
                  {filteredSubjectRequests.map((r) => {
                    const isPending = r.status === "pending";
                    const isApproved = r.status === "approved";
                    const isRejected = r.status === "rejected";

                    return (
                      <tr key={r._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-nav-accent font-bold">
                              {r.code}
                            </span>
                            <span className="text-nav-ink font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-nav-ink">
                          Semester {r.semester || 1} • Sec {r.section || "A"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-nav-subtle text-nav-ink border border-nav-line">
                            {r.department}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-nav-ink">
                            {r.facultyId?.name || "Faculty Member"}
                          </div>
                          <div className="text-[11px] text-nav-muted font-mono">
                            {r.facultyId?.email || "—"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-nav-muted">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-warning/15 text-nav-warning border border-nav-warning/30">
                              <Clock className="w-3 h-3" />
                              <span>Pending Review</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-success/15 text-nav-success border border-nav-success/30">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-nav-danger/15 text-nav-danger-ink border border-nav-danger/30">
                              <X className="w-3 h-3" />
                              <span>Declined</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  updateSubjectRequestMutation.mutate({
                                    id: r._id,
                                    status: "approved",
                                  });
                                }}
                                disabled={updateSubjectRequestMutation.isPending}
                                className="px-2.5 py-1 rounded-lg bg-nav-success/15 hover:bg-nav-success/25 text-nav-success border border-nav-success/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  updateSubjectRequestMutation.mutate({
                                    id: r._id,
                                    status: "rejected",
                                  });
                                }}
                                disabled={updateSubjectRequestMutation.isPending}
                                className="px-2.5 py-1 rounded-lg bg-nav-danger/15 hover:bg-nav-danger/25 text-nav-danger-ink border border-nav-danger/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Decline Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-nav-muted italic">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubjectRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-nav-muted">
                        No course addition requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

      {/* Management Dialogs */}
      <CreateSemesterDialog key={"CreateSemesterDialog-" + directories.currentSession?.academicYear} directories={directories} open={openDialog === "semester"} onClose={() => setOpenDialog(null)} />
      <EnrollStudentDialog key={"EnrollStudentDialog-" + directories.currentSession?.academicYear}
        open={openDialog === "enroll"}
        onClose={() => setOpenDialog(null)}
        directories={directories}
      />
      <CreateFacultyDialog open={openDialog === "faculty"} onClose={() => setOpenDialog(null)} />
      <CreateSubjectDialog open={openDialog === "subject"} onClose={() => setOpenDialog(null)} />
      {openDialog === "assign" && (
        directoriesQuery.isError || !directoriesQuery.data ? (
          <ModalWrapper open onClose={() => setOpenDialog(null)} title="Assign Faculty to Course Offerings" icon={UserCheck}>
            {directoriesQuery.isError ? (
              <div role="alert" className="space-y-3 text-sm text-nav-danger-ink">
                <p>{getErrorMessage(directoriesQuery.error)}</p>
                <button onClick={() => directoriesQuery.refetch()} className="text-nav-accent">Retry</button>
              </div>
            ) : <p role="status" className="text-sm text-nav-muted">Loading academic session…</p>}
          </ModalWrapper>
        ) : directories.currentSession ? (
          <AssignFacultyDialog
            onCatalogue={() => showDirectory("subjects")}
            onSaved={(form, count) => {
              setAllocationFacultyFilter(form.facultyId);
              setAllocationYearFilter(directories.currentSession.academicYear);
              setAllocationSemesterFilter(String(form.semester));
              const name = facultyList.find(f => f._id === form.facultyId)?.name || "Instructor";
              setAssignmentNotice(count ? `${count} assignment(s) saved for ${name}, semester ${form.semester}, section ${form.section || "A"}.` : "These courses were already assigned.");
              showDirectory("assignments");
            }}
            key={directories.currentSession.academicYear + "/" + directories.currentSession.activeSemesters.join(",")}
            onClose={() => setOpenDialog(null)}
            directories={directories}
          />
        ) : (
          <ModalWrapper open onClose={() => setOpenDialog(null)} title="Set Up Academic Session"
            subtitle="Choose the active term before assigning faculty." icon={Calendar}>
            <AcademicSessionForm onCancel={() => setOpenDialog(null)} submitLabel="Save and continue" />
          </ModalWrapper>
        )
      )}
      <ReferenceAudience />
      <PromoteStudentDialog
        open={openDialog === "promote"}
        onClose={() => setOpenDialog(null)}
        directories={directories}
      />
      {editingStudent && (
        <EditStudentDialog
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
        />
      )}
      {editingFaculty && (
        <EditFacultyDialog
          faculty={editingFaculty}
          onClose={() => setEditingFaculty(null)}
        />
      )}
      {editingSubject && (
        <EditSubjectDialog
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
        />
      )}
    </AppLayout>
  );
}
