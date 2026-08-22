import { useEffect, useMemo, useState } from "react";
import StudentSearchSelect from "../../components/StudentSearchSelect";
import apiClient from "../../services/apiClient";
import { formatDisciplineDate, formatDisciplineTime, getSchoolDateTimeDefaults } from "../../utils/disciplineDateTime";

const creatorDetails = (user) => {
  if (!user) return { name: "Not recorded", role: "" };
  return { name: user.name, role: user.role === "TEACHER" ? "Teacher" : user.role === "ADMIN" ? "Administrator" : user.role };
};

const fieldLabel = "mb-1.5 block text-sm font-medium text-gray-700";
const inputClass = "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100";

export default function TeacherDiscipline() {
  const defaults = getSchoolDateTimeDefaults();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [filterTerms, setFilterTerms] = useState([]);
  const [studentTerms, setStudentTerms] = useState([]);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [incidentDate, setIncidentDate] = useState(defaults.date);
  const [incidentTime, setIncidentTime] = useState(defaults.time);
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPage = async () => {
    setLoading(true); setError("");
    try {
      const [studentResponse, recordResponse, termResponse] = await Promise.all([
        apiClient.get("/teacher/discipline/students"), apiClient.get("/teacher/discipline"), apiClient.get("/teacher/discipline/terms"),
      ]);
      setStudents(studentResponse.data || []); setRecords(recordResponse.data || []); setFilterTerms(termResponse.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load discipline records.");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadPage(); }, []);

  const selectEntryStudent = async (value) => {
    setStudentId(value); setTermId(""); setStudentTerms([]); setError("");
    if (!value) return;
    try {
      const response = await apiClient.get(`/teacher/discipline/terms?studentId=${encodeURIComponent(value)}`);
      setStudentTerms(response.data || []);
    } catch (requestError) { setError(requestError.message || "Unable to load Terms for this student."); }
  };

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filterStudentId && String(record.studentId) !== String(filterStudentId)) return false;
    return !filterTermId || String(record.termId) === String(filterTermId);
  }), [records, filterStudentId, filterTermId]);

  const submit = async (event) => {
    event.preventDefault(); setMessage(""); setError("");
    if (!studentId || !termId || !incidentDate || !incidentTime || !type.trim()) {
      setError("Student, Term, incident date, incident time, and incident type are required."); return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/teacher/discipline", {
        studentId: Number(studentId), termId: Number(termId), incidentDate, incidentTime, type: type.trim(), note,
      });
      const next = getSchoolDateTimeDefaults();
      setType(""); setNote(""); setIncidentDate(next.date); setIncidentTime(next.time);
      setMessage("Discipline record added and made visible to school administration.");
      const response = await apiClient.get("/teacher/discipline"); setRecords(response.data || []);
    } catch (requestError) { setError(requestError.message || "Unable to add discipline record."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-1 py-2 sm:px-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Student wellbeing</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Discipline</h1>
        <p className="mt-1 text-sm text-gray-600">Record and review student discipline incidents for your assigned classes.</p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50/60 p-4 text-sm text-gray-700">
        <span aria-hidden="true">ℹ️</span><p><strong className="font-semibold text-gray-900">Shared school record.</strong> Records submitted here are visible to school administration.</p>
      </div>
      <div aria-live="polite">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-semibold text-gray-900">Find records</h2><p className="text-sm text-gray-500">Search within students you are assigned to teach.</p></div>
          {!loading && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}</span>}
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0"><label htmlFor="discipline-filter-student" className={fieldLabel}>Student</label><StudentSearchSelect inputId="discipline-filter-student" students={students} value={filterStudentId} onChange={setFilterStudentId} placeholder="Name or admission number" /></div>
          <div className="min-w-0"><label htmlFor="discipline-filter-term" className={fieldLabel}>Term</label><select id="discipline-filter-term" value={filterTermId} onChange={(event) => setFilterTermId(event.target.value)} className={inputClass}><option value="">All Terms</option>{filterTerms.map((term) => <option key={term.id} value={term.id}>{term.name} — {term.class?.name}</option>)}</select></div>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5"><h2 className="font-semibold text-gray-900">Add Discipline Record</h2><p className="text-sm text-gray-500">Enter when the incident occurred, not when it is being submitted.</p></div>
        <fieldset disabled={submitting} className="space-y-4">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0"><label htmlFor="discipline-student" className={fieldLabel}>Student <span className="text-red-600">*</span></label><StudentSearchSelect inputId="discipline-student" students={students} value={studentId} onChange={selectEntryStudent} placeholder="Name or admission number" disabled={submitting} /></div>
            <div className="min-w-0"><label htmlFor="discipline-term" className={fieldLabel}>Term <span className="text-red-600">*</span></label><select id="discipline-term" value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!studentId || submitting} className={inputClass} required><option value="">{studentId ? "Select Term" : "Select a student first"}</option>{studentTerms.map((term) => <option key={term.id} value={term.id}>{term.name} — {term.academicYear}</option>)}</select></div>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><label htmlFor="incident-date" className={fieldLabel}>Incident Date <span className="text-red-600">*</span></label><input id="incident-date" type="date" value={incidentDate} max={getSchoolDateTimeDefaults().date} onChange={(event) => setIncidentDate(event.target.value)} className={inputClass} required /></div>
            <div><label htmlFor="incident-time" className={fieldLabel}>Incident Time <span className="text-red-600">*</span></label><input id="incident-time" type="time" value={incidentTime} onChange={(event) => setIncidentTime(event.target.value)} className={inputClass} required /></div>
            <div className="sm:col-span-2 lg:col-span-1"><label htmlFor="incident-type" className={fieldLabel}>Incident / Type <span className="text-red-600">*</span></label><input id="incident-type" value={type} onChange={(event) => setType(event.target.value)} placeholder="e.g. Late, Fighting" className={inputClass} required /></div>
          </div>
          <div><label htmlFor="incident-note" className={fieldLabel}>Note <span className="font-normal text-gray-400">(optional)</span></label><textarea id="incident-note" value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Add relevant details about the incident" className={`${inputClass} resize-y`} /></div>
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto">{submitting ? "Adding record…" : "Add Discipline Record"}</button>
        </fieldset>
      </form>

      <section aria-label="Discipline records" className="space-y-3">
        {loading ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">Loading discipline records…</div> : filteredRecords.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"><div aria-hidden="true" className="text-2xl">○</div><h2 className="mt-2 font-semibold text-gray-800">No discipline records yet</h2><p className="mt-1 text-sm text-gray-500">No incidents match the current filters.</p></div> : filteredRecords.map((record) => {
          const creator = creatorDetails(record.recordedBy);
          return <article key={record.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-orange-200 sm:p-5"><div className="flex min-w-0 gap-3"><div aria-hidden="true" className="mt-1 h-9 w-1 shrink-0 rounded-full bg-orange-400" /><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="min-w-0"><h2 className="truncate font-semibold text-gray-900">{record.student?.firstName} {record.student?.lastName}</h2><p className="text-sm font-medium text-red-700">{record.type}</p><p className="mt-2 break-words text-sm text-gray-600">{record.notes || "No note provided."}</p></div><div className="shrink-0 text-sm text-gray-600 sm:text-right"><p className="font-medium text-gray-800">{formatDisciplineDate(record.date)}</p><p>{formatDisciplineTime(record.date)}</p></div></div><dl className="mt-4 grid gap-3 border-t pt-3 text-sm sm:grid-cols-3"><div><dt className="text-xs uppercase tracking-wide text-gray-400">Class</dt><dd className="mt-0.5 text-gray-700">{record.student?.class?.name || "—"}</dd></div><div><dt className="text-xs uppercase tracking-wide text-gray-400">Term</dt><dd className="mt-0.5 text-gray-700">{record.term ? `${record.term.name} — ${record.term.academicYear}` : "—"}</dd></div><div><dt className="text-xs uppercase tracking-wide text-gray-400">Recorded by</dt><dd className="mt-0.5 text-gray-700">{creator.name}{creator.role && <span className="block text-xs text-gray-500">{creator.role}</span>}</dd></div></dl></div></div></article>;
        })}
      </section>
    </div>
  );
}
