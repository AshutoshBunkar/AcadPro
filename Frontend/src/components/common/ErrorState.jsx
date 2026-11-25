import { AlertCircle, RefreshCw } from "lucide-react";
import { getErrorMessage } from "../../api/axios";

export default function ErrorState({ error, onRetry, className = "" }) {
  return (
    <div
      className={`p-4 rounded-2xl bg-[#F43F5E]/12 border border-[#F43F5E]/30 text-[#FDA4AF] text-xs sm:text-sm flex items-start justify-between gap-3 shadow-lg ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#F43F5E] mt-0.5" />
        <div>
          <p className="font-semibold text-white">Error Encountered</p>
          <p className="text-xs text-[#FDA4AF] mt-0.5 leading-relaxed">
            {getErrorMessage(error)}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
