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
} from "../api/admin";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/axios";
import AcademicSessionForm from "../components/AcademicSessionForm";

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
      <div className="admin-workspace max-w-5xl mx-auto space-y-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#356046] text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Admin Profile Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#FFFFFF] border border-[#C9D4CE] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00695E]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#00695E]/20 to-[#00695E]/20 border-2 border-[#00695E]/40 flex items-center justify-center text-[#00695E] font-extrabold text-3xl shadow-xl flex-shrink-0 overflow-hidden">
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
                    <Shield className="w-10 h-10 text-[#00695E]" />
                  )}
                </div>
                <button
                  onClick={openEditModal}
                  title="Change avatar picture"
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#F2F5F2] border border-[#C9D4CE] hover:border-[#00695E] text-[#00695E] shadow-lg cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#192D2A] tracking-tight">
                    {adminData?.name || "Root Administrator"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00695E]/15 text-[#00695E] border border-[#00695E]/30 uppercase tracking-wider">
                    SuperAdmin
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#526460] mt-1 font-medium">
                  {adminData?.designation || "Chief System Administrator"} • Central Institutional Authority
                </p>
                <p className="text-xs text-[#00695E] mt-0.5 font-mono">
                  {adminData?.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={openEditModal}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F2F5F2] hover:bg-[#E2EEE7] text-[#192D2A] border border-[#C9D4CE] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#00695E]" />
                <span>Edit Profile</span>
              </button>


              <button
                onClick={() => setShowSessionModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#00695E]/15 hover:bg-[#00695E]/25 text-[#00695E] border border-[#00695E]/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Update Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Logs & System Telemetry Section */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#C9D4CE] shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C9D4CE]">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-[#00695E]" />
              <div>
                <h3 className="text-sm font-bold text-[#192D2A]">
                  Administrative Security & Audit Logs
                </h3>
                <p className="text-xs text-[#526460]">
                  Real-time audit trail of institutional operations and administrative access
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#526460] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-xs text-[#192D2A] focus:outline-none focus:border-[#00695E]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#F2F5F2] border border-[#C9D4CE] rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00695E]" />
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#192D2A] focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-[#F2F5F2] text-[#192D2A]">All Statuses</option>
                  <option value="SUCCESS" className="bg-[#F2F5F2] text-[#192D2A]">Success</option>
                  <option value="FAILURE" className="bg-[#F2F5F2] text-[#192D2A]">Failure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#C9D4CE] text-[#526460] uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-bold">Event Action</th>
                  <th className="py-3 px-4 font-bold">Origin IP</th>
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9D4CE]/50 font-mono">
                {filteredLogs.map((log, idx) => (
                  <tr key={log._id || idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#192D2A]">
                      {log.action || "System Verification Event"}
                    </td>
                    <td className="py-3 px-4 text-[#00695E]">{log.ip || "127.0.0.1"}</td>
                    <td className="py-3 px-4 text-[#526460] font-sans">
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
                    <td colSpan={4} className="text-center py-8 text-[#526460] font-sans">
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
                className="fixed inset-0 bg-[#F7F6F1]/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowEditModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-[#FFFFFF] border border-[#C9D4CE] rounded-2xl shadow-2xl p-6 z-10 text-[#192D2A] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#C9D4CE]">
                  <h4 className="text-base font-bold text-[#192D2A]">
                    Edit Administrator Identity
                  </h4>
                  <button onClick={() => setShowEditModal(false)} className="p-1 text-[#526460] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#993F37] text-xs">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#526460] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-xs text-[#192D2A] focus:outline-none focus:border-[#00695E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#526460] mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-xs text-[#192D2A] focus:outline-none focus:border-[#00695E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#526460] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-xs text-[#192D2A] focus:outline-none focus:border-[#00695E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#526460] mb-1">
                      Avatar Picture URL
                    </label>
                    <div className="flex gap-2 items-center mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] overflow-hidden flex items-center justify-center flex-shrink-0">
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
                          <ImageIcon className="w-4 h-4 text-[#526460]" />
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="https://... or choose preset below"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-xs text-[#192D2A] focus:outline-none focus:border-[#00695E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-[#526460] font-medium">Or choose high-res avatar preset:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditAvatar(preset.url)}
                            className={`p-1 rounded-xl border text-center transition-all ${
                              editAvatar === preset.url
                                ? "border-[#00695E] bg-[#00695E]/10"
                                : "border-[#C9D4CE] hover:border-[#00695E]/50 bg-[#F2F5F2]"
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-10 object-cover rounded-lg mb-1"
                            />
                            <span className="block text-[9px] text-[#526460] truncate">
                              {preset.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[#C9D4CE]">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#526460] hover:text-[#192D2A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00695E] hover:bg-[#00554D] text-[#F7F6F1] shadow-md shadow-[#00695E]/20"
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
                className="fixed inset-0 bg-[#F7F6F1]/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowSessionModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-[#FFFFFF] border border-[#C9D4CE] rounded-2xl shadow-2xl p-6 z-10 text-[#192D2A] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#C9D4CE]">
                  <h4 className="text-base font-bold text-[#192D2A]">
                    Set Current Academic Session
                  </h4>
                  <button onClick={() => setShowSessionModal(false)} className="p-1 text-[#526460] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <AcademicSessionForm
                  currentSession={profileQuery.data?.stats?.currentSession}
                  onCancel={() => setShowSessionModal(false)}
                  onSaved={() => {
                    setShowSessionModal(false);
                    setToastMessage("Academic session updated institution-wide.");
                    setTimeout(() => setToastMessage(""), 4000);
                  }}
                  submitLabel="Broadcast Session"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
