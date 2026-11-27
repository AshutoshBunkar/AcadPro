import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { getErrorMessage } from "../api/axios";

export default function ReferenceAudience() {
  const [lecture, setLecture] = useState("");
  const [selected, setSelected] = useState([]);
  const list = useQuery({ queryKey: ["reference-candidates"], queryFn: () => api.get("/admin/reference-lectures").then(r => r.data.data) });
  const save = useMutation({ mutationFn: () => api.put("/lecture/" + lecture + "/reference", { semesters: selected }),
    onSuccess: () => list.refetch() });
  return <section className="p-5 rounded-xl border border-[#384151] space-y-3">
    <h2 className="font-bold">Reference lecture access</h2>
    <label className="block">Recording
      <select className="block w-full p-2 bg-[#191E28]" value={lecture} onChange={e => {
        setLecture(e.target.value); save.reset(); setSelected(list.data?.find(l => l._id === e.target.value)?.referenceSemesters || []);
      }}><option value="">Select a published lecture</option>
        {list.data?.map(l => <option key={l._id} value={l._id}>{l.title} · {l.department} · {l.offeringId?.academicYear} · Sem {l.offeringId?.semester}</option>)}
      </select></label>
    {lecture && <><fieldset className="flex flex-wrap gap-3"><legend>Share with semesters in this department</legend>
      {[1,2,3,4,5,6,7,8].map(n => <label key={n}><input type="checkbox" checked={selected.includes(n)}
        onChange={e => { save.reset(); setSelected(e.target.checked ? [...selected,n] : selected.filter(v => v !== n)); }} /> {n}</label>)}
    </fieldset><button disabled={save.isPending} onClick={() => save.mutate()} className="text-[#75D7FF]">Save audience</button></>}
    {save.isSuccess && <p role="status">Audience saved.</p>}
    {(save.isError || list.isError) && <p role="alert">{getErrorMessage(save.error || list.error)}</p>}
  </section>;
}
