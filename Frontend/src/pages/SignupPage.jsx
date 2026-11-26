import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { studentSignup, activateStudent } from "../api/auth";
import { getErrorMessage } from "../api/axios";

const inputClass = "mt-1 w-full rounded-lg bg-[#191E28] border border-[#475366] px-3 py-2 focus:outline-[#75D7FF]";

export default function SignupPage({ activation = false }) {
  const navigate = useNavigate();
  const [token] = useState(() => window.location.hash.slice(1));
  const mutation = useMutation({
    mutationFn: activation ? activateStudent : studentSignup,
    onSuccess: () => {
      if (activation) navigate("/login", { replace: true, state: { signupSuccess: true } });
    },
  });
  function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    mutation.mutate(activation ? { token, password: fields.password } : fields);
  }
  return (
    <main className="min-h-screen bg-[#08090D] text-white grid place-items-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-[#292F3B] bg-[#11141B] p-6 space-y-5">
        <h1 className="text-2xl font-bold">{activation ? "Choose your AcadPro password" : "Activate your student account"}</h1>
        <form onSubmit={submit} className="space-y-4">
          {activation ? <label className="block">New password (12 characters minimum)
            <input className={inputClass} type="password" name="password" autoComplete="new-password" minLength={12} required />
          </label> : <>
            <label className="block">College email
              <input className={inputClass} type="email" name="email" autoComplete="email" required />
            </label>
            <label className="block">Student MIS
              <input className={inputClass} name="mis" required maxLength={64} />
            </label>
          </>}
          {mutation.isError && <p role="alert">{getErrorMessage(mutation.error)}</p>}
          {mutation.isSuccess && !activation && <p role="status">If your details match the roster, check your college inbox. You can request another link after one minute.</p>}
          <button disabled={mutation.isPending} className="w-full rounded-lg bg-[#75D7FF] text-black font-semibold py-2 disabled:opacity-60">
            {mutation.isPending ? "Please wait…" : activation ? "Activate account" : "Email my activation link"}
          </button>
        </form>
        {activation && <Link className="block text-[#75D7FF]" to="/signup">Request a fresh link</Link>}
        <Link className="block text-[#75D7FF]" to="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
