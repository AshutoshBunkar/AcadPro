
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import api, { getErrorMessage } from "../api/axios";

const titles = { signup: "Finish creating your account", reset: "Reset your password", confirm: "Verify your existing account",
  invite: "Accept your faculty invitation", email: "Confirm your new email" };
export default function AccountLinkPage() {
  const { purpose } = useParams();
  const { hash } = useLocation();
  return <AccountForm key={purpose + hash} purpose={purpose} token={hash.slice(1)} />;
}
function AccountForm({ purpose, token }) {
  const title = Object.hasOwn(titles, purpose) ? titles[purpose] : null;
  const needsPassword = token && ["signup", "invite", "reset"].includes(purpose);
  const operation = useMutation({ mutationFn: fields => api.post(
    "/account/" + purpose + (token ? "/complete" : "/request"), token ? { token, ...fields } : fields) });
  return <main className="min-h-screen grid place-items-center p-4">
    <section className="w-full max-w-md rounded-xl border border-[#465366] bg-[#11141B] p-6 space-y-5">
      <h1 className="text-2xl font-bold">{title || "Unknown account link"}</h1>
      {title && <p>{purpose === "email"
        ? "Open the complete link sent to your proposed address. If it is missing or expired, ask your admin to resend the email change."
        : token ? "This one-time link expires after 15 minutes." : ({
          signup: "Return to signup to request a new verification link.",
          reset: "Enter the verified email on your account.",
          confirm: "If you already have a password, enter your email to verify your account. If you just signed up and still need to choose a password, return to signup for a fresh link.",
          invite: "Use the email address your admin invited."
        })[purpose] + " You can request another link after one minute."}</p>}
      {title && (!["signup", "email"].includes(purpose) || token) && !operation.isSuccess && <form className="space-y-4" onSubmit={e => {
        e.preventDefault(); operation.mutate(Object.fromEntries(new FormData(e.currentTarget)));
      }}>
        {!token && purpose !== "email" && <label className="block">Email
          <input className="block w-full p-2 bg-[#191E28]" required type="email" name="email" autoComplete="email" /></label>}
        {needsPassword && <label className="block">New password (6 characters minimum)
          <input className="block w-full p-2 bg-[#191E28]" required type="password" name="password" minLength={6} autoComplete="new-password" /></label>}
        {(token || purpose !== "email") && <button className="bg-[#75D7FF] text-black rounded px-4 py-2" disabled={operation.isPending}>
          {operation.isPending ? "Please wait…" : token ? "Confirm" : "Send my link"}</button>}
      </form>}
      {operation.isError && <p role="alert">{getErrorMessage(operation.error)}</p>}
      {operation.isSuccess && <p role="status">{operation.data.data.message}</p>}
      <nav className="flex flex-wrap gap-3 text-sm text-[#75D7FF]">
        {token && !["email", "signup"].includes(purpose) && title && <Link to={"/account/" + purpose}>Request a fresh link</Link>}
        <Link to="/signup">Student signup</Link>
        <Link to="/signup?role=faculty">Faculty signup</Link>
        {Object.entries(titles).filter(([key]) => key !== purpose && !["email", "signup"].includes(key)).map(([key, title]) =>
          <Link key={key} to={"/account/" + key}>{title}</Link>)}
        <Link to={operation.data?.data?.role === "faculty" ? "/login?role=faculty" : "/login"}>Back to sign in</Link>
      </nav>
    </section>
  </main>;
}
