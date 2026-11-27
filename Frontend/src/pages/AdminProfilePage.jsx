import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Calendar,
  CheckCircle2,
  X,
  Search,
  Filter,
  Terminal,
  Edit3,
  Camera,
  Image as ImageIcon,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import {
  getAdminProfile,
  updateAdminProfile,
  getSecurityLogs,
  updateAcademicSession,
} from "../api/admin";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/axios";
import {
  ACTIVE_ACADEMIC_YEAR,
  TERM_OPTIONS,
} from "../constants";

const AVATAR_PRESETS = [
  {
    label: "Professional Leader",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "Chief Executive",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "System Architect",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
  },
  {
    label: "Tech Director",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  },
];

export default function AdminProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals & form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Edit Profile Form state
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editError, setEditError] = useState("");


  // Session Form state
  const [sessionYear, setSessionYear] = useState(ACTIVE_ACADEMIC_YEAR);
  const [sessionTerm, setSessionTerm] = useState("ODD");
  const [sessionError, setSessionError] = useState("");
  const [sessionSuccess, setSessionSuccess] = useState("");


  // Security Logs Filter & Search
  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("ALL");

  // Fetch Admin Profile
  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile,
    select: (res) => res.data.data,
  });

  // Fetch Security Logs
  const logsQuery = useQuery({
    queryKey: ["admin-security-logs"],
    queryFn: getSecurityLogs,
    select: (res) => res.data.data,
  });

  const adminData = profileQuery.data?.admin || user;
  const securityLogs = useMemo(() => logsQuery.data?.logs || [], [logsQuery.data]);

  const openEditModal = () => {
    setEditName(adminData?.name || "");
    setEditDesignation(adminData?.designation || "Chief System Administrator");
    setEditPhone(adminData?.phone || "+91 (020) 2690-2101");
    setEditAvatar(adminData?.avatar || "");
    setEditError("");
    setShowEditModal(true);
  };


  const openSessionModal = () => {
    setSessionYear(profileQuery.data?.currentSession?.academicYear || ACTIVE_ACADEMIC_YEAR);
    setSessionTerm(profileQuery.data?.currentSession?.term || "ODD");
    setSessionError("");
    setSessionSuccess("");
    setShowSessionModal(true);
  };


  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (payload) => updateAdminProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setShowEditModal(false);
      setToastMessage("Admin profile updated successfully.");
      setTimeout(() => setToastMessage(""), 4000);
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });


  const updateSessionMutation = useMutation({
    mutationFn: (payload) => updateAcademicSession(payload),
    onSuccess: () => {
      setSessionSuccess("Academic session updated institution-wide.");
      setTimeout(() => {
        setShowSessionModal(false);
        setSessionSuccess("");
      }, 2000);
    },
    onError: (err) => setSessionError(getErrorMessage(err)),
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setEditError("");
    if (!editName.trim()) {
      setEditError("Full name is required.");
      return;
    }
    updateProfileMutation.mutate({
      name: editName.trim(),
      designation: editDesignation.trim(),
      phone: editPhone.trim(),
      avatar: editAvatar.trim(),
    });
  };


  const handleSaveSession = (e) => {
    e.preventDefault();
    setSessionError("");
    setSessionSuccess("");
    updateSessionMutation.mutate({
      academicYear: sessionYear,
      term: sessionTerm,
    });
  };


  // Filtered security logs
  const filteredLogs = useMemo(() => {
    const q = logSearch.toLowerCase().trim();
    return securityLogs.filter((log) => {
      const action = log.action || "";
      const ip = log.ip || "";
      const matchesText = !q || action.toLowerCase().includes(q) || ip.toLowerCase().includes(q);
      const matchesType = logFilter === "ALL" || log.status === logFilter;
      return matchesText && matchesType;
    });
  }, [securityLogs, logSearch, logFilter]);

  return (
    <AppLayout
      title="Master Security & Administrator Profile"
      subtitle="Cryptographic credentials, audit logs, and institutional authority controls"
      fullWidth
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Admin Profile Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#11141B] border border-[#292F3B] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF3D9A]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#FF3D9A]/20 to-[#75D7FF]/20 border-2 border-[#FF3D9A]/40 flex items-center justify-center text-[#FF3D9A] font-extrabold text-3xl shadow-xl flex-shrink-0 overflow-hidden">
                  {adminData?.avatar ? (
                    <img
                      src={adminData.avatar}
                      alt={adminData.name || "Admin"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Shield className="w-10 h-10 text-[#FF3D9A]" />
                  )}
                </div>
                <button
                  onClick={openEditModal}
                  title="Change avatar picture"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#191E28] border border-[#292F3B] hover:border-[#75D7FF] text-[#75D7FF] shadow-lg cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight">
                    {adminData?.name || "Root Administrator"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF3D9A]/15 text-[#FF3D9A] border border-[#FF3D9A]/30 uppercase tracking-wider">
                    SuperAdmin
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#A4ADBA] mt-1 font-medium">
                  {adminData?.designation || "Chief System Administrator"} • Central Institutional Authority
                </p>
                <p className="text-xs text-[#75D7FF] mt-0.5 font-mono">
                  {adminData?.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={openEditModal}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#75D7FF]" />
                <span>Edit Profile</span>
              </button>


              <button
                onClick={openSessionModal}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#75D7FF]/15 hover:bg-[#75D7FF]/25 text-[#75D7FF] border border-[#75D7FF]/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Update Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Logs & System Telemetry Section */}
        <div className="p-6 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#292F3B]">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-[#75D7FF]" />
              <div>
                <h3 className="text-sm font-bold text-[#F5F3EF]">
                  Administrative Security & Audit Logs
                </h3>
                <p className="text-xs text-[#A4ADBA]">
                  Real-time audit trail of institutional operations and administrative access
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#A4ADBA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#191E28] border border-[#292F3B] rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-[#75D7FF]" />
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#F5F3EF] focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#191E28] text-[#F5F3EF]">All Statuses</option>
                  <option value="SUCCESS" className="bg-[#191E28] text-[#F5F3EF]">Success</option>
                  <option value="FAILURE" className="bg-[#191E28] text-[#F5F3EF]">Failure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#292F3B] text-[#A4ADBA] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Event Action</th>
                  <th className="py-3 px-4 font-bold">Origin IP</th>
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292F3B]/50 font-mono">
                {filteredLogs.map((log, idx) => (
                  <tr key={log._id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#F5F3EF]">
                      {log.action || "System Verification Event"}
                    </td>
                    <td className="py-3 px-4 text-[#75D7FF]">{log.ip || "127.0.0.1"}</td>
                    <td className="py-3 px-4 text-[#A4ADBA] font-sans">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Just now"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                        {log.status || "SUCCESS"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[#A4ADBA] font-sans">
                      All audit records nominal. No anomalous security incidents recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================== */}
        {/* EDIT PROFILE MODAL */}
        {/* ============================================================== */}
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowEditModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 z-10 text-[#F5F3EF] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                  <h4 className="text-base font-bold text-[#F5F3EF]">
                    Edit Administrator Identity
                  </h4>
                  <button onClick={() => setShowEditModal(false)} className="p-1 text-[#A4ADBA] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Avatar Picture URL
                    </label>
                    <div className="flex gap-2 items-center mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#191E28] border border-[#292F3B] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {editAvatar ? (
                          <img
                            src={editAvatar}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#A4ADBA]" />
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="https://... or choose preset below"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-[#A4ADBA] font-medium">Or choose high-res avatar preset:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditAvatar(preset.url)}
                            className={`p-1 rounded-xl border text-center transition-all ${
                              editAvatar === preset.url
                                ? "border-[#75D7FF] bg-[#75D7FF]/10"
                                : "border-[#292F3B] hover:border-[#75D7FF]/50 bg-[#191E28]"
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-10 object-cover rounded-lg mb-1"
                            />
                            <span className="block text-[9px] text-[#A4ADBA] truncate">
                              {preset.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[#292F3B]">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A4ADBA] hover:text-[#F5F3EF]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Identity"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* UPDATE ACADEMIC SESSION MODAL */}
        {/* ============================================================== */}
        <AnimatePresence>
          {showSessionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowSessionModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 z-10 text-[#F5F3EF] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                  <h4 className="text-base font-bold text-[#F5F3EF]">
                    Set Current Academic Session
                  </h4>
                  <button onClick={() => setShowSessionModal(false)} className="p-1 text-[#A4ADBA] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {sessionError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs">
                    {sessionError}
                  </div>
                )}
                {sessionSuccess && (
                  <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{sessionSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSession} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Academic Year
                    </label>
                    <input aria-label="Academic year" required pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" value={sessionYear}
                      onChange={(e) => setSessionYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                     />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Academic Term
                    </label>
                    <select
                      value={sessionTerm}
                      onChange={(e) => setSessionTerm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    >
                      {TERM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#75D7FF]/10 border border-[#75D7FF]/25 text-[#75D7FF] text-xs space-y-1">
                    <p className="font-semibold">Concurrent Academic Scope:</p>
                    <p className="text-[#A4ADBA] text-[11px] leading-relaxed">
                      {sessionTerm === "ODD"
                        ? "Semesters 1, 3, 5, and 7 operate simultaneously for all undergraduate years (1st through 4th Year)."
                        : "Semesters 2, 4, 6, and 8 operate simultaneously for all undergraduate years (1st through 4th Year)."}
                    </p>
                  </div>


                  <div className="flex justify-end gap-3 pt-3 border-t border-[#292F3B]">
                    <button
                      type="button"
                      onClick={() => setShowSessionModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A4ADBA] hover:text-[#F5F3EF]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateSessionMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                    >
                      {updateSessionMutation.isPending ? "Broadcasting..." : "Broadcast Session"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
