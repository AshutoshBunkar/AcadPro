import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Badge,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { studentSignup } from "../api/auth";
import { COLLEGE_EMAIL_DOMAIN, DEPARTMENTS, STUDENT_REGISTRATION_SEMESTER_OPTIONS } from "../constants";
import { getErrorMessage } from "../api/axios";

const initialForm = {
  name: "",
  email: "",
  mis: "",
  department: "CSE",
  semester: 1,
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      studentSignup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        mis: form.mis.trim(),
        semester: Number(form.semester),
        department: form.department,
      }),
    onSuccess: () => {
      navigate("/login", { replace: true, state: { signupSuccess: true } });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (Object.values(form).some((v) => String(v).trim() === "")) {
      setFormError("All fields are required.");
      return;
    }
    if (!form.email.toLowerCase().endsWith(COLLEGE_EMAIL_DOMAIN)) {
      setFormError(`College email must end with ${COLLEGE_EMAIL_DOMAIN}`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-[#75D7FF]/20 selection:text-[#75D7FF]">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#75D7FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#FF3D9A]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#75D7FF]/20 to-[#FF3D9A]/20 border border-[#75D7FF]/30 shadow-[0_0_30px_-5px_rgba(117,215,255,0.25)] mb-3">
            <GraduationCap className="w-7 h-7 text-[#75D7FF]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#F5F3EF] tracking-tight">
            Join Acade<span className="text-[#75D7FF]">X</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A4ADBA] mt-1 font-medium">
            Create your student account with your institutional credentials
          </p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={form.name}
                  onChange={update("name")}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                />
              </div>
            </div>

            {/* Email & MIS Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Institutional Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder={`roll${COLLEGE_EMAIL_DOMAIN}`}
                    value={form.email}
                    onChange={update("email")}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-xs sm:text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Student MIS / ID
                </label>
                <div className="relative flex items-center">
                  <Badge className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 112203045"
                    value={form.mis}
                    onChange={update("mis")}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Department & Year Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Department
                </label>
                <select
                  value={form.department}
                  onChange={update("department")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.value} — {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Semester
                </label>
                <select
                  value={form.semester}
                  onChange={update("semester")}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                >
                  {STUDENT_REGISTRATION_SEMESTER_OPTIONS.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={update("password")}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 p-1 text-[#A4ADBA] hover:text-[#F5F3EF]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 p-1 text-[#A4ADBA] hover:text-[#F5F3EF]"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(formError || mutation.isError) && (
              <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#F43F5E]" />
                <span>{formError || getErrorMessage(mutation.error)}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#75D7FF] to-[#258BC4] hover:from-[#A8E7FF] hover:to-[#75D7FF] text-[#08090D] shadow-lg shadow-[#75D7FF]/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#75D7FF]"
            >
              {mutation.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#08090D] border-t-transparent rounded-full animate-spin"></span>
                  <span>Creating student account...</span>
                </>
              ) : (
                <>
                  <span>Complete Student Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Link to Login */}
            <div className="pt-2 text-center">
              <p className="text-xs text-[#A4ADBA]">
                Already registered?{" "}
                <RouterLink
                  to="/login"
                  className="font-semibold text-[#75D7FF] hover:text-[#A8E7FF] hover:underline transition-colors"
                >
                  Sign in here
                </RouterLink>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
