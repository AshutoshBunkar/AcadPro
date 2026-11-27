import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAcademicSession } from "../api/admin";
import { getErrorMessage } from "../api/axios";
import { ACTIVE_ACADEMIC_YEAR, TERM_OPTIONS } from "../constants";

export default function AcademicSessionForm({ currentSession, onCancel, onSaved, submitLabel }) {
  const queryClient = useQueryClient();
  const [academicYear, setAcademicYear] = useState(currentSession?.academicYear || ACTIVE_ACADEMIC_YEAR);
  const [term, setTerm] = useState(currentSession?.term || "ODD");
  const mutation = useMutation({
    mutationFn: updateAcademicSession,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-directories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-profile"] }),
      ]);
      onSaved?.();
    },
  });
  const fieldClass = "mt-1 block w-full px-3 py-2 rounded-xl bg-[#F2F5F2] border border-[#C9D4CE] text-[#192D2A]";

  return (
    <form className="space-y-4 text-xs text-[#526460]" onSubmit={(event) => {
      event.preventDefault();
      mutation.mutate({ academicYear, term });
    }}>
      <label className="block font-semibold">
        Academic year
        <input required pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" value={academicYear}
          onChange={(event) => setAcademicYear(event.target.value)} className={fieldClass} />
      </label>
      <label className="block font-semibold">
        Academic term
        <select value={term} onChange={(event) => setTerm(event.target.value)} className={fieldClass}>
          {TERM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <p>This sets the active academic year and teaching term for the whole institution.</p>
      {mutation.isError && <p role="alert" className="text-[#993F37]">{getErrorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-3 pt-3 border-t border-[#C9D4CE]">
        <button type="button" onClick={onCancel} className="px-4 py-2 font-semibold">Cancel</button>
        <button type="submit" disabled={mutation.isPending}
          className="px-5 py-2 rounded-xl font-bold bg-[#00695E] text-[#F7F6F1] disabled:opacity-50">
          {mutation.isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
