import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import apiClient from "../../services/apiClient";
import { suggestTermForLane } from "../../utils/teachingGroupTermSuggestions";

const blankLane = () => ({ classSubjectId: "", assignmentOwnerTeacherSubjectId: "", termId: "" });
export default function AdminTeachingGroups() {
  const [groups, setGroups] = useState([]);
  const [options, setOptions] = useState({ lanes: [], terms: [] });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", periodName: "", academicYear: String(new Date().getFullYear()), lanes: [blankLane(), blankLane()] });
  const load = async () => {
    const [groupsResult, optionsResult] = await Promise.all([apiClient.get("/admin/teaching-groups"), apiClient.get("/admin/teaching-groups/options")]);
    setGroups(groupsResult.data || []); setOptions(optionsResult.data || { lanes: [], terms: [] });
  };
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, []);
  const selected = useMemo(() => new Set(form.lanes.map((lane) => Number(lane.classSubjectId)).filter(Boolean)), [form.lanes]);
  const updateLane = (index, patch) => setForm((value) => ({ ...value, lanes: value.lanes.map((lane, i) => i === index ? { ...lane, ...patch } : lane) }));
  const selectLane = (index, id) => {
    const option = options.lanes.find((lane) => lane.id === Number(id));
    updateLane(index, { classSubjectId: id, assignmentOwnerTeacherSubjectId: option?.teacherSubjects.length === 1 ? String(option.teacherSubjects[0].id) : "", termId: option ? suggestTermForLane(options.terms, option.classId, form.periodName, form.academicYear) : "" });
  };
  const updatePeriod = (patch) => setForm((value) => ({ ...value, ...patch, lanes: value.lanes.map((lane) => { const option = options.lanes.find((item) => item.id === Number(lane.classSubjectId)); return option ? { ...lane, termId: suggestTermForLane(options.terms, option.classId, patch.periodName ?? value.periodName, patch.academicYear ?? value.academicYear) } : lane; }) }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await apiClient.post("/admin/teaching-groups", { ...form, lanes: form.lanes.map((lane) => ({ ...lane, memberTeacherSubjectIds: [Number(lane.assignmentOwnerTeacherSubjectId)] })) }); toast.success("Teaching group created"); setForm({ name: "", periodName: "", academicYear: String(new Date().getFullYear()), lanes: [blankLane(), blankLane()] }); await load(); }
    catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const setActive = async (group, active) => { try { await apiClient.patch(`/admin/teaching-groups/${group.id}/status`, { active }); await load(); } catch (error) { toast.error(error.message); } };

  return <div className="space-y-6"><header><h1 className="text-2xl font-bold">Teaching Groups</h1><p className="text-sm text-slate-600">Create combined workspaces while academic records stay class-specific.</p></header>
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Create teaching group</h2><div className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">Group name<input required className="mt-1 w-full rounded border p-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Grade 8-9 Kiswahili" /></label>
      <label className="text-sm">Period name<input required className="mt-1 w-full rounded border p-2" value={form.periodName} onChange={(event) => updatePeriod({ periodName: event.target.value })} placeholder="Term 3" /></label>
      <label className="text-sm">Academic year<input required className="mt-1 w-full rounded border p-2" value={form.academicYear} onChange={(event) => updatePeriod({ academicYear: event.target.value })} /></label></div>
      {form.lanes.map((lane, index) => { const option = options.lanes.find((item) => item.id === Number(lane.classSubjectId)); const terms = option ? options.terms.filter((term) => term.classId === option.classId) : []; return <fieldset key={index} className="rounded-lg border p-4"><legend className="px-2 font-semibold">Class lane {index + 1}</legend><div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">Class and subject<select required className="mt-1 w-full rounded border p-2" value={lane.classSubjectId} onChange={(event) => selectLane(index, event.target.value)}><option value="">Select class and subject</option>{options.lanes.map((item) => <option key={item.id} value={item.id} disabled={selected.has(item.id) && item.id !== Number(lane.classSubjectId)}>{item.class.name} — {item.subject.name}</option>)}</select></label>
        <label className="text-sm">Assignment owner<select required className="mt-1 w-full rounded border p-2" value={lane.assignmentOwnerTeacherSubjectId} onChange={(event) => updateLane(index, { assignmentOwnerTeacherSubjectId: event.target.value })}><option value="">Select teacher</option>{(option?.teacherSubjects || []).map((item) => <option key={item.id} value={item.id}>{item.teacher.name} ({item.teacher.email})</option>)}</select></label>
        <label className="text-sm">Mapped Term<select required className="mt-1 w-full rounded border p-2" value={lane.termId} onChange={(event) => updateLane(index, { termId: event.target.value })}><option value="">Review and select Term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name} / {term.academicYear}</option>)}</select><small className="text-slate-500">Unique name/year matches are suggested; confirm here.</small></label>
      </div></fieldset>; })}
      <div className="flex gap-2"><button type="button" className="rounded border px-3 py-2" onClick={() => setForm({ ...form, lanes: [...form.lanes, blankLane()] })}>Add lane</button>{form.lanes.length > 2 && <button type="button" className="rounded border px-3 py-2" onClick={() => setForm({ ...form, lanes: form.lanes.slice(0, -1) })}>Remove lane</button>}<button disabled={saving} className="ml-auto rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create group"}</button></div>
    </form>
    <section className="grid gap-4 lg:grid-cols-2">{groups.map((group) => <article key={group.id} className="rounded-xl border bg-white p-5 shadow-sm"><div className="flex justify-between"><div><h2 className="text-lg font-bold">{group.name}</h2><span className={group.isActive ? "text-green-700" : "text-slate-500"}>{group.isActive ? "Active" : "Ended"}</span></div><button className="rounded border px-3 py-1" onClick={() => setActive(group, !group.isActive)}>{group.isActive ? "End group" : "Reactivate"}</button></div><div className="mt-3 space-y-2">{group.classes.map((lane) => <div key={lane.id} className="rounded bg-slate-50 p-3 text-sm"><strong>{lane.classSubject.class.name}</strong> — {lane.classSubject.subject.name}<div>{lane.members.filter((member) => member.isActive).map((member) => `${member.teacherSubject.teacher.name}${member.isAssignmentOwner ? " (owner)" : ""}`).join(", ") || "No active member"}</div></div>)}</div>{group.periods.map((period) => <div key={period.id} className="mt-3 text-sm"><strong>{period.name} / {period.academicYear}</strong><ul className="ml-5 list-disc">{period.termMappings.map((mapping) => <li key={mapping.id}>{mapping.teachingGroupClass.classSubject.class.name}: {mapping.term.name} / {mapping.term.academicYear}</li>)}</ul></div>)}</article>)}</section>
  </div>;
}
