import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/apiClient";
import { formatGrade } from "../../utils/grading";

const tabs = ["Overview", "Academics", "Attendance", "Discipline", "Reports", "Transcripts", "Family", "Finance", "Health Notes"];
const date = (value) => value ? new Date(value).toLocaleDateString() : "Not recorded";
const Empty = ({ children }) => <p className="text-gray-500 py-4">{children}</p>;

export default function ArchivedStudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState("");
  const [history, setHistory] = useState({});
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");
  const [tabPage, setTabPage] = useState(1);
  const [tabPages, setTabPages] = useState(1);
  const [terms, setTerms] = useState([]);
  useEffect(() => { api.get(`/admin/archived/students/${studentId}`).then((r) => setStudent(r.data)).catch((e) => setError(e.response?.data?.message || "Unable to load former student record")); }, [studentId]);
  useEffect(() => { api.get(`/admin/archived/students/${studentId}/terms`).then((r) => setTerms(r.data)).catch(() => setTerms([])); }, [studentId]);
  const attendanceDays = useMemo(() => {
    if (!student) return [];
    const days = new Map();
    (history.attendance || []).forEach((entry) => {
      const key = `${entry.session.id}:${new Date(entry.session.date).toISOString().slice(0, 10)}`;
      const day = days.get(key) || { id: key, session: entry.session, morning: null, afternoon: null, legacy: null };
      day[entry.period.toLowerCase()] = entry.status;
      days.set(key, day);
    });
    return [...days.values()].map((day) => {
      let result = "INCOMPLETE";
      if (day.legacy) result = day.legacy;
      else if (day.morning && day.afternoon) {
        if (day.morning === "ABSENT" && day.afternoon === "ABSENT") result = "ABSENT";
        else if ([day.morning, day.afternoon].includes("LATE")) result = "LATE";
        else if ([day.morning, day.afternoon].includes("EXCUSED")) result = "EXCUSED";
        else result = "PRESENT";
      }
      return { ...day, result };
    });
  }, [student, history.attendance]);
  const [termId, setTermId] = useState("");
  useEffect(() => { if (terms.length && !termId) setTermId(String(terms[0].id)); }, [terms, termId]);
  useEffect(() => {
    if (!student || tab === "Overview" || tab === "Health Notes") return;
    const section = tab === "Reports" ? "report-cards" : tab.toLowerCase().replace(" ", "-");
    setTabLoading(true); setTabError("");
    const get = (key, kind) => api.get(`/admin/archived/students/${studentId}/history/${section}`, { params: { page: tabPage, pageSize: 50, ...(termId ? { termId } : {}), ...(kind ? { kind } : {}) } }).then((r) => [key, r.data.records, r.data.totalPages]);
    const requests = tab === "Academics" ? [get("scores"), get("assessmentScores", "assessments"), get("grades", "grades"), get("reportComments", "comments")] : tab === "Finance" ? [get("fees"), get("invoices", "invoices"), get("sponsorships", "sponsorships")] : [get(section === "report-cards" ? "reportCards" : section)];
    Promise.all(requests).then((pairs) => { setHistory((old) => ({ ...old, ...Object.fromEntries(pairs.map(([key, records]) => [key, records])) })); setTabPages(Math.max(1, ...pairs.map((pair) => pair[2] || 1))); }).catch((e) => setTabError(e.response?.data?.message || "Unable to load history")).finally(() => setTabLoading(false));
  }, [student, studentId, tab, tabPage, termId]);
  if (error) return <div className="p-6 text-red-700">{error}</div>;
  if (!student) return <div className="p-6">Loading former student record…</div>;
  const selected = Number(termId);
  const openPdf = async (id) => { const response = await api.get(`/report-cards/${id}/pdf`, { responseType: "blob" }); const url = URL.createObjectURL(response.data); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); };
  const termFilter = (item, getter) => !selected || getter(item) === selected;
  return <div className="p-4 md:p-6 max-w-7xl mx-auto">
    <button onClick={() => navigate("/dashboard/admin/archived")} className="text-blue-700 mb-4">← Archived Students</button>
    <header className="bg-white border rounded-xl p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1><span className="inline-block mt-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1">Former Student</span></div><div className="grid sm:grid-cols-2 gap-x-8 text-sm"><p><b>Admission No:</b> {student.admissionNo}</p><p><b>Last Class:</b> {student.classEnrollments[0]?.classNameSnapshot || student.class?.name || "Not recorded"}</p><p><b>Archived:</b> {date(student.archivedAt)}</p><p><b>Date of Birth:</b> {date(student.dob)}</p></div></div></header>
    <nav className="flex gap-2 overflow-x-auto py-4">{tabs.map((name) => <button key={name} onClick={() => { setTab(name); setTabPage(1); }} className={`whitespace-nowrap px-3 py-2 rounded ${tab === name ? "bg-blue-700 text-white" : "bg-gray-100"}`}>{name}</button>)}</nav>
    <section className="bg-white border rounded-xl p-4 overflow-x-auto">
      {tabLoading && <p>Loading {tab.toLowerCase()}…</p>}{tabError && <p className="text-red-700">{tabError}</p>}
      {tab === "Overview" && <div><h2 className="font-bold mb-3">Class History</h2>{student.classEnrollments.map((x) => <div key={x.id} className="border rounded p-3 mb-2"><b>{x.classNameSnapshot}</b><p>{x.status} · Started: {date(x.startedAt)} · Ended: {date(x.endedAt)}</p><p className="text-xs text-gray-500">Source: {x.source || "Not recorded"}</p></div>)}</div>}
      {tab === "Academics" && <div><TermSelect terms={terms} value={termId} setValue={setTermId}/><History title="Assignments / Scores" rows={(history.scores || []).filter((x) => termFilter(x, (y) => y.assignment.termId))} render={(x) => `${x.assignment.teacherSubject.subject.name} — ${x.assignment.title}: ${x.score}/${x.maxPoints ?? x.assignment.maxPoints}`}/><History title="Assessments / Scores" rows={(history.assessmentScores || []).filter((x) => termFilter(x, (y) => y.assessment.termId))} render={(x) => `${x.assessment.subject.name} — ${x.assessment.title}: ${x.score}/${x.assessment.maxScore}`}/><History title="Published Grades" rows={(history.grades || []).filter((x) => termFilter(x, (y) => y.termId))} render={(x) => `${x.subject.name}: ${x.average}% (${formatGrade(x.average)})`}/><History title="Teacher Comments" rows={(history.reportComments || []).filter((x) => termFilter(x, (y) => y.termId))} render={(x) => `${x.teacherSubject.subject.name}: ${x.comment}`}/></div>}
      {tab === "Attendance" && <History title="Attendance History" rows={attendanceDays} render={(x) => `${date(x.session.date)} · ${x.session.class.name} · ${x.session.term?.name || "No term"} · Morning: ${x.morning || "Not marked"} · Afternoon: ${x.afternoon || "Not marked"} · Daily result: ${x.result}`}/>}
      {tab === "Discipline" && <History title="Discipline History" rows={history.discipline || []} render={(x) => `${new Date(x.date).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })} · ${x.type} · ${x.term?.name || "No term"} · ${x.notes || "No notes"} · ${x.recordedBy?.name || "Unknown"} (${x.recordedBy?.role || "—"})`}/>}
      {tab === "Reports" && <History title="Report Cards" rows={history.reportCards || []} render={(x) => <div>{x.term.name} {x.term.academicYear} · {x.class.name} · {x.status} · {x.subjects.map((s) => `${s.subject.name}: ${s.average}%`).join("; ")}<div>{x.status === "PUBLISHED" ? <button className="text-blue-700 underline" onClick={() => openPdf(x.id)}>View / Download PDF</button> : <span className="text-gray-500">PDF available after publication</span>}</div></div>}/>}
      {tab === "Transcripts" && <History title="Transcript Snapshots" rows={history.transcripts || []} render={(x) => `${x.term.name} ${x.term.academicYear} · ${x.entries.map((e) => `${e.subjectName}: ${e.finalGrade}% ${e.letterGrade}`).join("; ")}`}/>}
      {tab === "Family" && <div><History title="Parents" rows={student.parentLinks} render={(x) => `${x.parent.name} · ${x.parent.relationship || "Relationship not recorded"} · ${x.parent.phone || "No phone"} · ${x.parent.email || "No email"} · ${x.parent.address || "No address"}`}/><History title="Guardians" rows={student.guardians} render={(x) => `${x.user.name} · ${x.relation || "Relationship not recorded"} · ${x.user.email}`}/><History title="Contact History" rows={history.family || []} render={(x) => `${date(x.createdAt)} · ${x.message}`}/></div>}
      {tab === "Finance" && <div><History title="Fees / Payments" rows={history.fees || []} render={(x) => `Charged ${x.amount}; paid ${x.paid}; payments: ${x.payments.map((p) => `${p.amount} on ${date(p.date)}`).join(", ") || "none"}`}/><History title="Invoices" rows={history.invoices || []} render={(x) => `${x.amount} · ${x.status} · issued ${date(x.issuedAt)}`}/><History title="Sponsorship" rows={history.sponsorships || []} render={(x) => `${x.sponsor.name} · ${x.type} · ${x.notes || "No notes"}`}/></div>}
      {tab === "Health Notes" && (student.healthNotes ? <p className="whitespace-pre-wrap">{student.healthNotes}</p> : <Empty>No health notes recorded.</Empty>)}
      {!['Overview', 'Health Notes'].includes(tab) && <div className="flex justify-between pt-4"><button disabled={tabPage <= 1} onClick={() => setTabPage((p) => p - 1)}>Previous</button><span>Page {tabPage} of {tabPages}</span><button disabled={tabPage >= tabPages} onClick={() => setTabPage((p) => p + 1)}>Next</button></div>}
    </section>
  </div>;
}

function TermSelect({ terms, value, setValue }) { return <select className="border rounded px-3 py-2 mb-4" value={value} onChange={(e) => setValue(e.target.value)}><option value="">All evidenced terms</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.academicYear}</option>)}</select>; }
function History({ title, rows, render }) { return <div className="mb-5"><h3 className="font-semibold mb-2">{title}</h3>{rows.length ? rows.map((row, index) => <div key={row.id ?? index} className="border-b py-2 whitespace-normal">{render(row)}</div>) : <Empty>No records found.</Empty>}</div>; }
