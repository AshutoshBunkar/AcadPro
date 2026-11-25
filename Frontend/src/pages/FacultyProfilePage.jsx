import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Clock,
  MapPin,
  Phone,
  BookOpen,
  Edit3,
  CheckCircle2,
  X,
  Award,
} from "lucide-react";

import AppLayout from "../components/layout/AppLayout";
import { getFacultyProfile, updateFacultyProfile, changeFacultyPassword } from "../api/auth";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../api/axios";

export default function FacultyProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modals & form state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Edit Profile form state
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOfficeLocation, setEditOfficeLocation] = useState("");
  const [editOfficeHours, setEditOfficeHours] = useState("");
  const [editError, setEditError] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Fetch Faculty Profile
  const profileQuery = useQuery({
    queryKey: ["faculty-profile"],
    queryFn: getFacultyProfile,
    select: (res) => res.data.data,
  });

  const facultyData = profileQuery.data?.faculty || user;
  const assignments = profileQuery.data?.assignments || [];

  const openEditModal = () => {
    setEditName(facultyData?.name || "");
    setEditDesignation(facultyData?.designation || "");
    setEditSpecialization(facultyData?.specialization || "");
    setEditPhone(facultyData?.phone || "");
    setEditOfficeLocation(facultyData?.officeLocation || "");
    setEditOfficeHours(facultyData?.officeHours || "");
    setEditError("");
    setShowEditModal(true);
  };

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setShowPasswordModal(true);
  };

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload) => updateFacultyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-profile"] });
      setShowEditModal(false);
      setToastMessage("Faculty profile updated successfully.");
      setTimeout(() => setToastMessage(""), 4000);
    },
    onError: (err) => {
      setEditError(getErrorMessage(err));
    },
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (payload) => changeFacultyPassword(payload),
    onSuccess: () => {
      setPasswordSuccess("Security password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 2000);
    },
    onError: (err) => {
      setPasswordError(getErrorMessage(err));
    },
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
      specialization: editSpecialization.trim(),
      phone: editPhone.trim(),
      officeLocation: editOfficeLocation.trim(),
      officeHours: editOfficeHours.trim(),
    });
  };

  const handleSavePassword = (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <AppLayout
      title="Faculty Profile & Credentials"
      subtitle="Institutional identity, office schedule, and security settings"
      fullWidth
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Profile Hero Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#11141B] border border-[#292F3B] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#75D7FF]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#75D7FF]/25 to-[#FF3D9A]/25 border-2 border-[#75D7FF]/40 flex items-center justify-center text-[#75D7FF] font-extrabold text-3xl shadow-xl flex-shrink-0">
                {facultyData?.name ? facultyData.name.charAt(0).toUpperCase() : "F"}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight">
                    {facultyData?.name || "Faculty Member"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#75D7FF]/15 text-[#75D7FF] border border-[#75D7FF]/30 uppercase tracking-wider">
                    Faculty
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#A4ADBA] mt-1 font-medium">
                  {facultyData?.designation ? (
                    <span className="text-[#F5F3EF]">{facultyData.designation}</span>
                  ) : (
                    <span className="italic text-[#A4ADBA]/60">Designation not set</span>
                  )}{" "}
                  •{" "}
                  {facultyData?.department ? (
                    <span>{facultyData.department} Department</span>
                  ) : (
                    <span className="italic text-[#A4ADBA]/60">Department not set</span>
                  )}
                </p>
                <p className="text-xs text-[#75D7FF] mt-0.5 font-mono">
                  {facultyData?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={openEditModal}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#191E28] hover:bg-[#252C3B] text-[#F5F3EF] border border-[#292F3B] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#75D7FF]" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={openPasswordModal}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#75D7FF]/15 hover:bg-[#75D7FF]/25 text-[#75D7FF] border border-[#75D7FF]/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Details & Office Location */}
          <div className="p-6 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#292F3B]">
              <Award className="w-5 h-5 text-[#75D7FF]" />
              <h3 className="text-sm font-bold text-[#F5F3EF]">
                Academic Specialization & Location
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[#A4ADBA] block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Specialization Field
                </span>
                {facultyData?.specialization ? (
                  <p className="text-[#F5F3EF] font-medium text-sm">
                    {facultyData.specialization}
                  </p>
                ) : (
                  <p className="text-[#A4ADBA]/60 italic text-xs">
                    Not specified (Click &quot;Edit Profile&quot; to add)
                  </p>
                )}
              </div>

              <div>
                <span className="text-[#A4ADBA] block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Campus Office Location
                </span>
                {facultyData?.officeLocation ? (
                  <p className="text-[#F5F3EF] font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#75D7FF] flex-shrink-0" />
                    <span>{facultyData.officeLocation}</span>
                  </p>
                ) : (
                  <p className="text-[#A4ADBA]/60 italic text-xs flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#A4ADBA]/40 flex-shrink-0" />
                    <span>Not specified</span>
                  </p>
                )}
              </div>

              <div>
                <span className="text-[#A4ADBA] block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Direct Phone / Intercom
                </span>
                {facultyData?.phone ? (
                  <p className="text-[#F5F3EF] font-mono flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#75D7FF] flex-shrink-0" />
                    <span>{facultyData.phone}</span>
                  </p>
                ) : (
                  <p className="text-[#A4ADBA]/60 italic text-xs flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#A4ADBA]/40 flex-shrink-0" />
                    <span>Not provided</span>
                  </p>
                )}
              </div>

              <div>
                <span className="text-[#A4ADBA] block mb-1 font-semibold uppercase tracking-wider text-[10px]">
                  Student Office Hours & Availability
                </span>
                {facultyData?.officeHours ? (
                  <p className="text-[#F5F3EF] font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF3D9A] flex-shrink-0" />
                    <span>{facultyData.officeHours}</span>
                  </p>
                ) : (
                  <p className="text-[#A4ADBA]/60 italic text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#A4ADBA]/40 flex-shrink-0" />
                    <span>Not specified</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Subjects Summary */}
          <div className="p-6 rounded-2xl bg-[#11141B] border border-[#292F3B] shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#75D7FF]" />
                <h3 className="text-sm font-bold text-[#F5F3EF]">
                  Active Teaching Assignments
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#191E28] text-[#75D7FF] border border-[#292F3B]">
                {assignments.length} Courses
              </span>
            </div>

            <div className="space-y-3">
              {assignments.length === 0 ? (
                <p className="text-xs text-[#A4ADBA] py-6 text-center">
                  No courses assigned to this profile yet.
                </p>
              ) : (
                assignments.map((a, idx) => (
                  <div
                    key={a._id || idx}
                    className="p-3 rounded-xl bg-[#191E28]/50 border border-[#292F3B] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#75D7FF] mr-2">
                        {a.subjectId?.code || "SUB"}
                      </span>
                      <span className="font-semibold text-[#F5F3EF]">
                        {a.subjectId?.name || "Course Offering"}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>
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
                className="relative w-full max-w-lg bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 sm:p-7 z-10 text-[#F5F3EF] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                  <h4 className="text-base font-bold text-[#F5F3EF]">
                    Edit Faculty Profile Information
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
                      placeholder="Enter your full name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Associate Professor, Assistant Professor"
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
                        placeholder="e.g. +91 98765 43210"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems & Algorithms"
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Office Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Academic Block A, Room 304"
                      value={editOfficeLocation}
                      onChange={(e) => setEditOfficeLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Office Hours / Student Consultation Schedule
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mon, Wed: 3:00 PM - 5:00 PM"
                      value={editOfficeHours}
                      onChange={(e) => setEditOfficeHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
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
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* CHANGE PASSWORD MODAL */}
        {/* ============================================================== */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="fixed inset-0 bg-[#08090D]/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowPasswordModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-md bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 z-10 text-[#F5F3EF] space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#292F3B]">
                  <h4 className="text-base font-bold text-[#F5F3EF]">
                    Change Account Password
                  </h4>
                  <button onClick={() => setShowPasswordModal(false)} className="p-1 text-[#A4ADBA] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#A4ADBA] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[#292F3B]">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A4ADBA] hover:text-[#F5F3EF]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#FF3D9A] hover:bg-[#FF66AE] text-white shadow-md shadow-[#FF3D9A]/20"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
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
