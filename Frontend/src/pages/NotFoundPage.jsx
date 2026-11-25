import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { DASHBOARD_PATH } from "../constants";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  const handleReturn = () => {
    if (isAuthenticated && role && DASHBOARD_PATH[role]) {
      navigate(DASHBOARD_PATH[role]);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-[#F5F3EF] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-[#FF3D9A]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-[#75D7FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF3D9A]/20 to-[#75D7FF]/20 border border-[#FF3D9A]/40 mb-6 shadow-[0_0_30px_-5px_rgba(255,61,154,0.3)]">
          <GraduationCap className="w-8 h-8 text-[#FF3D9A]" />
        </div>

        <h1 className="text-7xl font-extrabold font-display tracking-tight text-[#F5F3EF] mb-2">
          4<span className="text-[#FF3D9A]">0</span>4
        </h1>

        <h2 className="text-xl font-bold text-[#F5F3EF] mb-2">
          Page Not Found
        </h2>

        <p className="text-sm text-[#A4ADBA] mb-8 leading-relaxed">
          The lecture, module, or administrative endpoint you are trying to reach does not exist or has been relocated.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#11141B] hover:bg-[#191E28] border border-[#292F3B] text-[#F5F3EF] transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#A4ADBA]" />
            <span>Go Back</span>
          </button>

          <button
            onClick={handleReturn}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-[#75D7FF] hover:bg-[#A8E7FF] text-[#08090D] shadow-lg shadow-[#75D7FF]/20 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
