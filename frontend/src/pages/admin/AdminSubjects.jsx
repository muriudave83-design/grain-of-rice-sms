import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await apiClient.get("/admin/subjects");
        setSubjects(res.data);
      } catch (err) {
        console.error("Failed to fetch subjects", err);
      }
    };

    fetchSubjects();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold">Subjects</h1>

      {subjects.length === 0 ? (
        <p>No subjects yet</p>
      ) : (
        <ul>
          {subjects.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
