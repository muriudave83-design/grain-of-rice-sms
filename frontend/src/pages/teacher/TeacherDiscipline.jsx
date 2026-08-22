import { useEffect, useMemo, useState } from "react";
import StudentSearchSelect from "../../components/StudentSearchSelect";
import apiClient from "../../services/apiClient";

const recordedByLabel = (user) => {
  if (!user) return "Not recorded";
  const role = user.role === "TEACHER" ? "Teacher" : user.role === "ADMIN" ? "Administrator" : user.role;
  return `${user.name} — ${role}`;
};

export default function TeacherDiscipline() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [filterTerms, setFilterTerms] = useState([]);
  const [studentTerms, setStudentTerms] = useState([]);
  const [filterStudentId, setFilterStudentId] = useState("");
  const [filterTermId, setFilterTermId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPage = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentResponse, recordResponse, termResponse] = await Promise.all([
        apiClient.get("/teacher/discipline/students"),
        apiClient.get("/teacher/discipline"),
        apiClient.get("/teacher/discipline/terms"),
      ]);
      setStudents(studentResponse.data || []);
      setRecords(recordResponse.data || []);
      setFilterTerms(termResponse.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load discipline records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPage(); }, []);

  const selectEntryStudent = async (value) => {
    setStudentId(value);
    setTermId("");
    setStudentTerms([]);
    setError("");
    if (!value) return;
    try {
      const response = await apiClient.get(`/teacher/discipline/terms?studentId=${encodeURIComponent(value)}`);
      setStudentTerms(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load Terms for this student");
    }
  };

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filterStudentId && String(record.studentId) !== String(filterStudentId)) return false;
    if (filterTermId && String(record.termId) !== String(filterTermId)) return false;
    return true;
  }), [records, filterStudentId, filterTermId]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!studentId || !termId || !type.trim()) {
      setError("Student, Term, and incident/type are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/teacher/discipline", {
        studentId: Number(studentId), termId: Number(termId), type: type.trim(), note,
      });
      setType("");
      setNote("");
      setMessage("Discipline record added.");
      const response = await apiClient.get("/teacher/discipline");
      setRecords(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to add discipline record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-2 sm:p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discipline</h1>
        <p className="text-sm text-gray-600">Records are limited to students in your assigned classes.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Find records</h2>
        <div className="flex flex-wrap gap-3">
          <StudentSearchSelect students={students} value={filterStudentId} onChange={setFilterStudentId} placeholder="Search by name or admission number" />
          <select value={filterTermId} onChange={(event) => setFilterTermId(event.target.value)} className="rounded border bg-white p-2">
            <option value="">All Terms</option>
            {filterTerms.map((term) => <option key={term.id} value={term.id}>{term.name} — {term.class?.name}</option>)}
          </select>
        </div>
      </section>

      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Add Discipline Record</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <StudentSearchSelect students={students} value={studentId} onChange={selectEntryStudent} placeholder="Select student by name or admission number" disabled={submitting} />
          <select value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!studentId || submitting} className="rounded border bg-white p-2 disabled:bg-gray-100" required>
            <option value="">{studentId ? "Select Term" : "Select a student first"}</option>
            {studentTerms.map((term) => <option key={term.id} value={term.id}>{term.name} — {term.academicYear}</option>)}
          </select>
          <input value={type} onChange={(event) => setType(event.target.value)} placeholder="Incident / Type" className="rounded border p-2" disabled={submitting} required />
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" className="rounded border p-2" disabled={submitting} />
        </div>
        <button disabled={submitting} className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400">{submitting ? "Adding…" : "Add"}</button>
      </form>

      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {loading ? <p className="p-4 text-gray-500">Loading discipline records…</p> : filteredRecords.length === 0 ? <p className="p-4 text-gray-500">No discipline records found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left"><tr><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Term</th><th className="p-3">Incident</th><th className="p-3">Note</th><th className="p-3">Date</th><th className="p-3">Recorded By</th></tr></thead>
              <tbody>{filteredRecords.map((record) => <tr key={record.id} className="border-t"><td className="p-3">{record.student?.firstName} {record.student?.lastName}<div className="text-xs text-gray-500">{record.student?.admissionNo}</div></td><td className="p-3">{record.student?.class?.name || "—"}</td><td className="p-3">{record.term ? `${record.term.name} — ${record.term.academicYear}` : "—"}</td><td className="p-3">{record.type}</td><td className="p-3">{record.notes || "—"}</td><td className="p-3">{new Date(record.date).toLocaleDateString()}</td><td className="p-3">{recordedByLabel(record.recordedBy)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
