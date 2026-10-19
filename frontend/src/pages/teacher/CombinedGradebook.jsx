import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import BackButton from "../../components/BackButton";
import apiClient from "../../services/apiClient";
import { flattenCombinedRoster, visibleCombinedAssignments } from "../../utils/combinedGradebookPresentation";
import { acceptAuthoritativeValue, beginConfirmedOverwrite, beginSave, editSaveField, failSave, finishSave, hasUnresolvedSaves } from "../../utils/reliableSaveState";
import useUnsavedChangesGuard from "../../utils/useUnsavedChangesGuard";

const newKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const bad = (state) => state?.status === "Failed" || state?.status === "Conflict";

export default function CombinedGradebook() {
  const { groupId } = useParams();
  const [data, setData] = useState(null);
  const [fields, setFields] = useState({});
  const fieldsRef = useRef(fields);
  const [form, setForm] = useState({ title: "", type: "ASSIGNMENT", maxPoints: 100, weight: 1, requestKey: newKey() });
  const load = useCallback(async () => setData((await apiClient.get(`/teacher/teaching-groups/${groupId}/gradebook`)).data), [groupId]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => { load().catch((error) => toast.error(error.message)); }, [load]);
  useUnsavedChangesGuard(fields, fieldsRef);
  const students = useMemo(() => flattenCombinedRoster(data?.sections), [data?.sections]);
  const visibleAssignments = useMemo(() => visibleCombinedAssignments(data?.assignments), [data?.assignments]);

  const saveScore = async (studentId, assignment, value, serverValue) => {
    if (value === "") return;
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > assignment.maxPoints) return;
    const key = `${studentId}-${assignment.id}`;
    const saving = beginSave(fieldsRef.current[key], serverValue);
    fieldsRef.current = { ...fieldsRef.current, [key]: saving };
    setFields(fieldsRef.current);
    try {
      const response = await apiClient.post(`/teacher/teaching-groups/${groupId}/scores`, { studentId, combinedAssignmentId: assignment.id, score, expectedScore: saving.serverValue });
      if (fieldsRef.current[key]?.sequence !== saving.sequence) return;
      setFields((previous) => ({ ...previous, [key]: finishSave(previous[key], saving.sequence, response.data.score) }));
      setData((previous) => ({ ...previous, assignments: previous.assignments.map((item) => item.id !== assignment.id ? item : { ...item, scores: item.scores.some((entry) => entry.studentId === studentId) ? item.scores.map((entry) => entry.studentId === studentId ? response.data : entry) : [...item.scores, response.data] }) }));
    } catch (error) {
      if (!error?.response) {
        try {
          const refreshed = (await apiClient.get(`/teacher/teaching-groups/${groupId}/gradebook`)).data;
          const authoritative = refreshed.assignments?.find((item) => item.id === assignment.id)?.scores?.find((item) => item.studentId === studentId)?.score ?? null;
          if (fieldsRef.current[key]?.sequence === saving.sequence && authoritative === score) {
            setData(refreshed);
            setFields((previous) => ({ ...previous, [key]: finishSave(previous[key], saving.sequence, authoritative) }));
            return;
          }
        } catch (reconcileError) { console.error("Combined score reconciliation failed", reconcileError); }
      }
      setFields((previous) => ({ ...previous, [key]: failSave(previous[key], saving.sequence, error.message, error?.response?.status === 409, error?.response?.data?.details?.current?.score) }));
    }
  };

  const acceptSavedScore = (key) => {
    const current = fieldsRef.current[key];
    if (!current || current.status !== "Conflict") return;
    const accepted = acceptAuthoritativeValue(current, current.authoritativeValue);
    fieldsRef.current = { ...fieldsRef.current, [key]: accepted };
    setFields(fieldsRef.current);
  };

  const overwriteScore = (studentId, assignment, key) => {
    const current = fieldsRef.current[key];
    if (!current || current.status !== "Conflict") return;
    if (!globalThis.confirm("Overwrite the newer saved score with your value?")) return;
    const prepared = beginConfirmedOverwrite(current, current.authoritativeValue);
    fieldsRef.current = { ...fieldsRef.current, [key]: prepared };
    setFields(fieldsRef.current);
    saveScore(studentId, assignment, prepared.draftValue, prepared.serverValue);
  };

  const editScore = (key, serverValue, draftValue) => {
    const edited = editSaveField(fieldsRef.current[key], serverValue, draftValue);
    fieldsRef.current = { ...fieldsRef.current, [key]: edited };
    setFields(fieldsRef.current);
  };

  const create = async (event) => { event.preventDefault(); try { await apiClient.post(`/teacher/teaching-groups/${groupId}/assignments`, { ...form, periodId: data.period.id }); setForm({ title: "", type: "ASSIGNMENT", maxPoints: 100, weight: 1, requestKey: newKey() }); await load(); toast.success("Assignment created across every class lane"); } catch (error) { toast.error(error.message); } };
  const update = async (assignment, patch) => { try { await apiClient.put(`/teacher/teaching-groups/${groupId}/assignments/${assignment.id}`, patch); await load(); } catch (error) { toast.error(error.message); } };
  const rename = async (assignment) => { if (data.readOnly || assignment.isLocked) return; const title = window.prompt("Rename assignment", assignment.title)?.trim(); if (!title || title === assignment.title) return; await update(assignment, { title }); };
  const lock = (assignment) => apiClient.put(`/teacher/teaching-groups/${groupId}/assignments/${assignment.id}/lock`, { isLocked: !assignment.isLocked }).then(load).catch((error) => toast.error(error.message));
  const remove = async (assignment) => { try { const preview = (await apiClient.get(`/teacher/teaching-groups/${groupId}/assignments/${assignment.id}/delete-preview`)).data; const confirmation = preview.requiredConfirmation ? window.prompt(`Type ${preview.requiredConfirmation} to remove ${preview.scoreCount} scores and invalidate ${preview.publishedGradeCount} current Grades.`) : undefined; if (preview.requiredConfirmation && confirmation !== preview.requiredConfirmation) return; await apiClient.delete(`/teacher/teaching-groups/${groupId}/assignments/${assignment.id}`, { data: { confirmation } }); await load(); } catch (error) { toast.error(error.message); } };
  const move = async (assignment, delta) => { const items = [...data.assignments]; const index = items.findIndex((item) => item.id === assignment.id); const target = index + delta; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; try { await apiClient.put(`/teacher/teaching-groups/${groupId}/assignments/reorder`, { periodId: data.period.id, assignments: items.map((item, position) => ({ id: item.id, position })) }); await load(); } catch (error) { toast.error(error.message); } };

  if (!data) return <div className="p-6">Loading combined gradebook…</div>;
  return <div className="space-y-6 p-4 md:p-6"><BackButton /><header><h1 className="text-2xl font-bold">{data.group.name}</h1><p className="text-slate-600">{data.period.name} / {data.period.academicYear} · one workspace, class-specific records</p></header>
    {hasUnresolvedSaves(fields) && <p className="text-sm text-amber-700">Some marks are Unsaved, Saving, Failed, or in Conflict.</p>}
    {data.readOnly && <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800">A mapped Term is locked. The whole combined workspace is read-only.</div>}
    <form onSubmit={create} className="grid gap-2 rounded-lg border bg-white p-4 md:grid-cols-6"><input required className="rounded border p-2 md:col-span-2" placeholder="Assignment title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><select className="rounded border p-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>ASSIGNMENT</option><option>TEST</option><option>PROJECT</option></select><input aria-label="Maximum points" type="number" min="1" className="rounded border p-2" value={form.maxPoints} onChange={(event) => setForm({ ...form, maxPoints: event.target.value })} /><input aria-label="Weight" type="number" min="0.01" step="0.01" className="rounded border p-2" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /><button disabled={data.readOnly} className="rounded bg-blue-600 p-2 font-semibold text-white disabled:opacity-50">Create once</button></form>
    <section className="rounded-xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full"><thead><tr><th className="sticky left-0 z-10 min-w-60 border bg-white p-2 text-left">Student</th>{visibleAssignments.map((assignment, index) => <th key={assignment.id} className="min-w-48 border p-2"><div className="font-semibold">{assignment.title}</div><small className="block text-slate-500">/{assignment.maxPoints}</small><div className="mt-2 flex flex-wrap justify-center gap-2 text-xs"><button type="button" disabled={data.readOnly || index === 0} onClick={() => move(assignment, -1)} className="disabled:opacity-40" aria-label={`Move ${assignment.title} left`}>←</button><button type="button" disabled={data.readOnly || index === visibleAssignments.length - 1} onClick={() => move(assignment, 1)} className="disabled:opacity-40" aria-label={`Move ${assignment.title} right`}>→</button><button type="button" disabled={data.readOnly || assignment.isLocked} onClick={() => rename(assignment)} className="font-medium text-blue-700 disabled:text-slate-400">Rename</button><button type="button" disabled={data.readOnly} onClick={() => lock(assignment)} className="disabled:opacity-40">{assignment.isLocked ? "Unlock" : "Lock"}</button><button type="button" disabled={data.readOnly} className="text-red-600 disabled:text-slate-400" onClick={() => remove(assignment)}>Delete</button></div></th>)}</tr></thead><tbody>{students.map((student) => <tr key={student.id}><td className="sticky left-0 z-10 border bg-white p-2 font-medium">{student.firstName} {student.lastName}<small className="block text-slate-500">{student.admissionNo} · {student.class?.name}</small></td>{visibleAssignments.map((assignment) => { const persisted = assignment.scores.find((item) => item.studentId === student.id)?.score ?? null; const key = `${student.id}-${assignment.id}`; const field = fields[key]; return <td key={assignment.id} className="border p-2 text-center"><input type="number" min="0" max={assignment.maxPoints} value={field?.draftValue ?? persisted ?? ""} disabled={data.readOnly || assignment.isLocked} onChange={(event) => editScore(key, persisted, event.target.value)} onBlur={(event) => saveScore(student.id, assignment, event.target.value, persisted)} className="w-20 rounded border p-1" />{field && <div className={`text-xs ${bad(field) ? "text-red-700" : "text-gray-600"}`}>{field.status}{field.error && <span> — {field.error}</span>}{field.status === "Failed" && <button type="button" className="ml-2 underline" onClick={() => saveScore(student.id, assignment, field.draftValue, field.serverValue)}>Retry</button>}{field.status === "Conflict" && <span className="ml-2 space-x-2"><button type="button" className="underline" onClick={() => acceptSavedScore(key)}>Use saved value</button><button type="button" className="underline" onClick={() => overwriteScore(student.id, assignment, key)}>Overwrite with my value</button></span>}</div>}</td>; })}</tr>)}</tbody></table></div></section>
  </div>;
}
