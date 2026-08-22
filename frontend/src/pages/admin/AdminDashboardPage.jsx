import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { formatTermLabel } from "../../utils/formatTermLabel";
import { calculateDashboardFinance, reconcileDashboardTerm } from "../../utils/adminDashboardMetrics";

const Metric = ({ label, value }) => (
  <div className="rounded border p-4"><p className="text-gray-500">{label}</p><p className="text-xl font-bold">{value}</p></div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState(null);
  const [teachers, setTeachers] = useState(null);
  const [classes, setClasses] = useState(null);
  const [fees, setFees] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [terms, setTerms] = useState([]);
  const [currentTermId, setCurrentTermId] = useState("");
  const [globalErrors, setGlobalErrors] = useState({});
  const [disciplineError, setDisciplineError] = useState("");

  const fetchTerms = useCallback(async () => {
    try {
      const response = await apiClient.get("/terms", { silent: true });
      const validTerms = Array.isArray(response.data) ? response.data : [];
      setTerms(validTerms);
      setCurrentTermId((previous) => reconcileDashboardTerm(previous, validTerms));
    } catch (error) {
      console.error("Failed to fetch terms", error);
      setTerms([]);
      setCurrentTermId("");
    }
  }, []);

  const fetchGlobalData = useCallback(async () => {
    const requests = [
      ["students", "/students", setStudents],
      ["teachers", "/admin/users", (data) => setTeachers(data.filter((user) => user.role === "TEACHER" && user.isActive !== false && !user.isArchived))],
      ["classes", "/admin/classes", setClasses],
      ["fees", "/fees", setFees],
    ];
    const results = await Promise.allSettled(requests.map(([, url]) => apiClient.get(url, { silent: true })));
    const errors = {};
    results.forEach((result, index) => {
      const [key, , setter] = requests[index];
      if (result.status === "fulfilled" && Array.isArray(result.value.data)) setter(result.value.data);
      else errors[key] = "Not available";
    });
    setGlobalErrors(errors);
  }, []);

  useEffect(() => { fetchTerms(); fetchGlobalData(); }, [fetchGlobalData, fetchTerms]);

  useEffect(() => {
    if (!currentTermId) {
      setDiscipline(null);
      setDisciplineError("");
      return;
    }
    let cancelled = false;
    setDiscipline(null);
    setDisciplineError("");
    apiClient.get(`/discipline?termId=${currentTermId}`, { silent: true })
      .then((response) => { if (!cancelled) setDiscipline(Array.isArray(response.data) ? response.data : []); })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load discipline metric", error);
          setDisciplineError("Not available");
        }
      });
    return () => { cancelled = true; };
  }, [currentTermId]);

  const currentTerm = terms.find((term) => String(term.id) === currentTermId) || null;
  const finance = useMemo(() => calculateDashboardFinance(fees || []), [fees]);
  const globalValue = (key, records) => globalErrors[key] || (records === null ? "Loading…" : records.length);
  const financeValue = (key) => globalErrors.fees || (fees === null ? "Loading…" : finance[key]);
  const termMetric = !currentTermId ? "Select a term" : disciplineError || (discipline === null ? "Loading…" : discipline.length);
  const attendanceMetric = currentTermId ? "Not available" : "Select a term";

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium" htmlFor="dashboard-term-filter">Dashboard filter — class-specific term</label>
        <p className="mb-2 text-sm text-gray-500">This filters term-specific dashboard data only. Global school totals are unaffected.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select id="dashboard-term-filter" value={currentTermId} onChange={(event) => setCurrentTermId(event.target.value)} className="max-w-full border p-2">
            <option value="">{terms.length === 0 ? "No terms configured" : "Select a term"}</option>
            {terms.map((term) => <option key={term.id} value={term.id}>{formatTermLabel(term)}</option>)}
          </select>
          <button type="button" disabled={!currentTermId} onClick={async () => {
            try { await apiClient.put(`/terms/${currentTermId}/lock`); await fetchTerms(); }
            catch (error) { console.error("Failed to update term", error); }
          }} className={`px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400 ${currentTerm?.isLocked ? "bg-red-500" : "bg-green-500"}`}>
            {currentTerm?.isLocked ? "Unlock Term" : "Lock Term"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Students" value={globalValue("students", students)} />
        <Metric label="Total Fees" value={financeValue("totalFees")} />
        <Metric label="Total Paid" value={financeValue("totalPaid")} />
        <Metric label="Outstanding" value={financeValue("totalOutstanding")} />
        <Metric label="Discipline (Selected Term)" value={termMetric} />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Metric label="Total Students" value={globalValue("students", students)} />
        <Metric label="Total Teachers" value={globalValue("teachers", teachers)} />
        <Metric label="Active Classes" value={globalValue("classes", classes)} />
        <Metric label="Avg Attendance" value={attendanceMetric} />
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-3 font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button onClick={() => navigate("/dashboard/admin/students")} className="rounded bg-yellow-500 p-2 text-white">Add Student</button>
          <button onClick={() => navigate("/dashboard/admin/teachers")} className="rounded bg-pink-500 p-2 text-white">Add Teacher</button>
          <button onClick={() => navigate("/dashboard/admin/parents")} className="rounded bg-green-500 p-2 text-white">Add Parent</button>
        </div>
      </div>
    </div>
  );
}
