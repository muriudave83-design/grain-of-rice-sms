import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function AdminStudentProfile() {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("fees");

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const res = await apiClient.get(`/students/${id}`);
      setStudent(res.data);
    } catch (err) {
      console.error("Failed to fetch student:", err);
    }
  };

  if (!student) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      {/* HEADER */}
      <h1 className="text-2xl font-bold">
        {student.firstName} {student.lastName}
      </h1>
      <p className="text-gray-500 mb-4">
        Adm No: {student.admissionNo}
      </p>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {["fees", "discipline", "sponsorship"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 capitalize ${
              tab === t
                ? "border-b-2 border-blue-500 font-bold"
                : "text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {tab === "fees" && <FeesTab studentId={id} />}
      {tab === "discipline" && <DisciplineTab studentId={id} />}
      {tab === "sponsorship" && <SponsorshipTab studentId={id} />}
    </div>
  );
}

/* =========================
   FEES TAB
========================= */
function FeesTab({ studentId }) {
  const [fees, setFees] = useState([]);
  const [showOnlyBalance, setShowOnlyBalance] = useState(false);

  useEffect(() => {
    fetchFees();
  }, [studentId, showOnlyBalance]);

  const fetchFees = async () => {
    try {
      const res = await apiClient.get("/fees");

      const filtered = res.data.filter((f) => {
        if (f.studentId != studentId) return false;
        if (showOnlyBalance && f.amount - f.paid <= 0) return false;
        return true;
      });

      setFees(filtered);
    } catch (err) {
      console.error("Failed to fetch fees:", err);
    }
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Fees</h2>

      {/* FILTER */}
      <label className="block mb-2">
        <input
          type="checkbox"
          checked={showOnlyBalance}
          onChange={() => setShowOnlyBalance(!showOnlyBalance)}
        />{" "}
        Show only outstanding balance
      </label>

      {fees.length === 0 ? (
        <p className="text-gray-500">No fee records</p>
      ) : (
        fees.map((f) => (
          <div key={f.id} className="border p-3 mb-2">
            <p>Total: {f.amount}</p>
            <p>Paid: {f.paid}</p>
            <p>Balance: {f.amount - f.paid}</p>
          </div>
        ))
      )}
    </div>
  );
}
/* =========================
   DISCIPLINE TAB
========================= */
function DisciplineTab({ studentId }) {
  const [records, setRecords] = useState([]);
  const [termId, setTermId] = useState("");
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    fetchTerms();
  }, []);

  useEffect(() => {
    fetchData();
  }, [studentId, termId]);

  const fetchTerms = async () => {
    try {
      const res = await apiClient.get("/terms");
      setTerms(res.data);
    } catch (err) {
      console.error("Failed to fetch terms:", err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await apiClient.get("/discipline");

      const filtered = res.data.filter((r) => {
        if (r.studentId != studentId) return false;
        if (termId && String(r.termId) !== String(termId)) return false;
        return true;
      });

      setRecords(filtered);
    } catch (err) {
      console.error("Failed to fetch discipline:", err);
    }
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Discipline</h2>

      {/* TERM FILTER */}
      <select
        value={termId}
        onChange={(e) => setTermId(e.target.value)}
        className="border p-2 mb-3"
      >
        <option value="">All Terms</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {records.length === 0 ? (
        <p className="text-gray-500">No discipline records</p>
      ) : (
        records.map((r) => (
          <div key={r.id} className="border p-3 mb-2">
            <p className="font-semibold">{r.type}</p>
            <p>{r.notes || "-"}</p>
            <p className="text-sm text-gray-500">
              {new Date(r.date).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
/* =========================
   SPONSORSHIP TAB
========================= */
function SponsorshipTab({ studentId }) {
  const [data, setData] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [studentId, typeFilter]);

  const fetchData = async () => {
    try {
      const res = await apiClient.get("/sponsorship");

      const filtered = res.data.filter((s) => {
        if (s.studentId != studentId) return false;
        if (typeFilter && s.type !== typeFilter) return false;
        return true;
      });

      setData(filtered);
    } catch (err) {
      console.error("Failed to fetch sponsorship:", err);
    }
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Sponsorship</h2>

      {/* 🔥 TYPE FILTER */}
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="border p-2 mb-3"
      >
        <option value="">All</option>
        <option value="FULL">FULL</option>
        <option value="HALF">HALF</option>
      </select>

      {data.length === 0 ? (
        <p className="text-gray-500">No sponsorship records</p>
      ) : (
        data.map((s) => (
          <div key={s.id} className="border p-3 mb-2">
            <p className="font-semibold">
              {s.sponsor?.name || "Unknown Sponsor"}
            </p>
            <p className="text-sm text-gray-500">{s.type}</p>
          </div>
        ))
      )}
    </div>
  );
}