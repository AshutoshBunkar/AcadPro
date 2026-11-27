import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api, { getErrorMessage } from "../api/axios";

const titles = { reset: "Reset your password", confirm: "Verify your existing account",
  invite: "Accept your faculty invitation", email: "Confirm your new email" };
export default function AccountLinkPage() {
  const { purpose } = useParams();
  const [token] = useState(() => window.location.hash.slice(1));
  const needsPassword = token && ["invite", "reset"].includes(purpose);
  const operation = useMutation({ mutationFn: fields => api.post(
    "/account/" + purpose + (token ? "/complete" : "/request"), token ? { token, ...fields } : fields) });
  return <main className="min-h-screen grid place-items-center p-4">
    <section className="w-full max-w-md rounded-xl border border-[#465366] bg-[#11141B] p-6 space-y-5">
      <h1 className="text-2xl font-bold">{titles[purpose] || "Unknown account link"}</h1>
      {titles[purpose] && !operation.isSuccess && <form className="space-y-4" onSubmit={e => {
        e.preventDefault(); operation.mutate(Object.fromEntries(new FormData(e.currentTarget)));
      }}>
        {!token && purpose !== "email" && <label className="block">Email
          <input className="block w-full p-2 bg-[#191E28]" required type="email" name="email" autoComplete="email" /></label>}
        {needsPassword && <label className="block">New password (12 characters minimum)
          <input className="block w-full p-2 bg-[#191E28]" required type="password" name="password" minLength={12} autoComplete="new-password" /></label>}
        {(token || purpose !== "email") && <button className="bg-[#75D7FF] text-black rounded px-4 py-2" disabled={operation.isPending}>
          {operation.isPending ? "Please wait…" : token ? "Confirm" : "Send my link"}</button>}
      </form>}
      {operation.isError && <p role="alert">{getErrorMessage(operation.error)}</p>}
      {operation.isSuccess && <p role="status">{operation.data.data.message}</p>}
      <Link className="text-[#75D7FF]" to="/login">Back to sign in</Link>
    </section>
  </main>;
}
