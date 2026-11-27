import { useState } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { studentLogin, facultyLogin, adminLogin } from "../api/auth";
import { useAuth } from "../context/useAuth";
import { ROLES, DASHBOARD_PATH } from "../constants";
import { getErrorMessage } from "../api/axios";

const TABS = [
  { value: ROLES.STUDENT, label: "Student", icon: GraduationCap, loginFn: studentLogin },
  { value: ROLES.FACULTY, label: "Faculty", icon: BookOpen, loginFn: facultyLogin },
  { value: ROLES.ADMIN, label: "Admin", icon: Shield, loginFn: adminLogin },
];

export default function LoginPage() {
  const [tab, setTab] = useState(ROLES.STUDENT);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const activeTab = TABS.find((t) => t.value === tab);

  const mutation = useMutation({
    mutationFn: () => activeTab.loginFn(tab === ROLES.STUDENT && !email.includes("@") ? { mis: email.trim(), password } : { email: email.trim(), password }),
    onSuccess: (res) => {
      login(tab, res.data.data);
      navigate(DASHBOARD_PATH[tab], { replace: true });
    },
  });

  const handleTabChange = (value) => {
    setTab(value);
    mutation.reset();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-[#75D7FF]/20 selection:text-[#75D7FF]">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#75D7FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#FF3D9A]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#75D7FF]/20 to-[#FF3D9A]/20 border border-[#75D7FF]/30 shadow-[0_0_30px_-5px_rgba(117,215,255,0.25)] mb-4">
            <GraduationCap className="w-7 h-7 text-[#75D7FF]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#F5F3EF] tracking-tight">
            Acad<span className="text-[#75D7FF]">Pro</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A4ADBA] mt-1.5 font-medium">
            Sign in to access your lectures, modules & academic portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#11141B] border border-[#292F3B] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Signup Success Notice */}
          {location.state?.signupSuccess && (
            <div className="mb-5 p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6EE7B7] text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#10B981]" />
              <span>Student account created successfully. Please sign in below.</span>
            </div>
          )}

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#191E28] border border-[#292F3B] mb-6">
            {TABS.map((t) => {
              const TabIcon = t.icon;
              const isSelected = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTabChange(t.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#75D7FF] ${
                    isSelected
                      ? "bg-[#75D7FF] text-[#08090D] shadow-md shadow-[#75D7FF]/20"
                      : "text-[#A4ADBA] hover:text-[#F5F3EF] hover:bg-white/5"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="login-identity" className="block text-xs font-semibold text-[#A4ADBA] mb-1.5">
                {tab === ROLES.STUDENT ? "Email or MIS" : "Email"}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                <input
                  id="login-identity" type={tab === ROLES.STUDENT ? "text" : "email"} autoComplete="username"
                  required
                  placeholder={
                    tab === ROLES.STUDENT
                      ? "rollnumber@iiitp.ac.in"
                      : "username@acadpro.edu"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#A4ADBA]">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#A4ADBA] absolute left-3.5 pointer-events-none" />
                <input
                  id="login-password" autoComplete="current-password" type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#191E28] border border-[#292F3B] text-sm text-[#F5F3EF] placeholder-[#A4ADBA]/50 focus:outline-none focus:border-[#75D7FF] focus:ring-1 focus:ring-[#75D7FF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 rounded-lg text-[#A4ADBA] hover:text-[#F5F3EF] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message Alert */}
            {mutation.isError && (
              <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#F43F5E]" />
                <span className="leading-tight">{getErrorMessage(mutation.error)}</span>
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in as {activeTab.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Student Registration Link */}
            {tab === ROLES.STUDENT && (
              <div className="pt-2 text-center">
                <p className="text-xs text-[#A4ADBA]">
                  New to AcadPro?{" "}
                  <RouterLink
                    to="/signup"
                    className="font-semibold text-[#75D7FF] hover:text-[#A8E7FF] hover:underline transition-colors"
                  >
                    Create student account
                  </RouterLink>
                </p>
              </div>
            )}

            <nav aria-label="Account help" className="flex flex-wrap justify-center gap-3 text-xs text-[#75D7FF]">
              <RouterLink to="/account/reset">Forgot password?</RouterLink>
              <RouterLink to="/account/confirm">Verify existing account</RouterLink>
              {tab === ROLES.FACULTY && <RouterLink to="/account/invite">Resend invitation</RouterLink>}
            </nav>
            <div className="pt-4 mt-4 border-t border-[#292F3B] text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A4ADBA]/80">
                <Sparkles className="w-3 h-3 text-[#FF3D9A]" />
                <span>Protected by institutional role-based access control</span>
              </span>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
