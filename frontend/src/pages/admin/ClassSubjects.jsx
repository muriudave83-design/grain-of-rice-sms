import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import AdminLayout from "../../components/layout/AdminLayout";

export default function ClassSubjects() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [c, s, a] = await Promise.all([
      axios.get("/admin/classes"),
      axios.get("/admin/subjects"),
      axios.get("/admin/class-subjects"),
    ]);

    setClasses(c.data);
    setSubjects(s.data);
    setAssignments(a.data);
  };

  const assign = async () => {
    if (!classId || !subjectId) {
      alert("Select class and subject");
      return;
    }

    await axios.post("/admin/class-subjects", {
      classId: Number(classId),
      subjectId: Number(subjectId),
    });

    setClassId("");
    setSubjectId("");
    loadData();
  };

  return (
    <AdminLayout title="Class ↔ Subject Assignment">
      <div style={{ maxWidth: 600 }}>
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          style={{ marginTop: 10 }}
        >
          <option value="">Select Subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button onClick={assign} style={{ marginTop: 10 }}>
          Assign
        </button>

        <hr />

        <h4>Existing Assignments</h4>
        <ul>
          {assignments.map((a) => (
            <li key={a.id}>
              {a.class.name} — {a.subject.name}
            </li>
          ))}
        </ul>
      </div>
    </AdminLayout>
  );
}
