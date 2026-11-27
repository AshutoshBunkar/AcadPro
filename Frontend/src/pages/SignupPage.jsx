import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { studentSignup, facultySignup } from "../api/auth";
import { getErrorMessage } from "../api/axios";

import { DEPARTMENTS, SEMESTER_LABELS } from "../constants";

const inputClass = "mt-1 w-full rounded-lg bg-[#191E28] border border-[#475366] px-3 py-2 focus:outline-[#75D7FF]";

export default function SignupPage() {
  const [params] = useSearchParams();
  const faculty = params.get("role") === "faculty";
  const role = faculty ? "faculty" : "student";
  const mutation = useMutation({
    mutationFn: faculty ? facultySignup : studentSignup,
  });
  function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    mutation.mutate(fields);
  }
  return (
    <main className="min-h-screen bg-[#08090D] text-white grid place-items-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-[#292F3B] bg-[#11141B] p-6 space-y-5">
        <h1 className="text-2xl font-bold">Create your {role} account</h1>
        <p>Enter your details. We’ll email you a link to verify your address and choose your password.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">Full name
            <input className={inputClass} name="name" required maxLength={120} autoComplete="name" />
          </label>
          <label className="block">Department
            <select className={inputClass} name="department" required defaultValue="">
              <option disabled value="">Select your department</option>
              {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label className="block">Email
            <input className={inputClass} type="email" name="email" autoComplete="email" required />
          </label>
          {!faculty && <><label className="block">Current semester
            <select className={inputClass} name="semester" required defaultValue="">
              <option disabled value="">Select your semester</option>
              {Object.entries(SEMESTER_LABELS).map(([n, label]) => <option key={n} value={n}>{label}</option>)}
            </select>
          </label>
          <label className="block">Student MIS
            <input className={inputClass} name="mis" required maxLength={64} />
          </label></>}
          {mutation.isError && <p role="alert">{getErrorMessage(mutation.error)}</p>}
          {mutation.isSuccess && <p role="status">{mutation.data.data.message}</p>}
          <button disabled={mutation.isPending} className="w-full rounded-lg bg-[#75D7FF] text-black font-semibold py-2 disabled:opacity-60">
            {mutation.isPending ? "Please wait…" : "Email my verification link"}
          </button>
        </form>
        <Link className="block text-[#75D7FF]" to="/account/confirm">Already have an unverified account?</Link>
        <Link className="block text-[#75D7FF]" to={faculty ? "/login?role=faculty" : "/login"}>Back to sign in</Link>
      </section>
    </main>
  );
}
