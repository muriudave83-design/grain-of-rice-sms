import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await apiClient.get("/admin/subjects");
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post("/admin/subjects", { name, code });
      setName("");
      setCode("");
      fetchSubjects();
    } catch (err) {
      console.error("Failed to create subject", err);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Subjects</h1>

      <form onSubmit={handleCreate} className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <input
          type="text"
          placeholder="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2"
        >
          Create Subject
        </button>
      </form>

      {subjects.length === 0 ? (
        <p>No subjects yet</p>
      ) : (
        <ul className="space-y-1">
          {subjects.map((s) => (
            <li key={s.id}>
              {s.name} ({s.code})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
