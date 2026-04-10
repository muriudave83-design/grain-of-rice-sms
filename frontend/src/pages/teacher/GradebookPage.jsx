import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";

export default function GradebookPage() {
  const [gradebooks, setGradebooks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGradebooks();
  }, []);

  const fetchGradebooks = async () => {
    try {
      const res = await apiClient.get("/teacher/subjects"); 
      // 👆 this should already exist (TeacherSubject endpoint)

      setGradebooks(res.data);
    } catch (err) {
      console.error("Failed to fetch gradebooks", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gradebook</h1>

      <div className="grid gap-4">
        {gradebooks.map((gb) => (
          <div
            key={gb.id}
            onClick={() => navigate(`/teacher/gradebook/${gb.id}`)}
            className="p-4 border rounded-lg cursor-pointer hover:bg-gray-100"
          >
            <h2 className="text-lg font-semibold">
              {gb.class?.name} - {gb.subject?.name}
            </h2>

            <p className="text-sm text-gray-500">
              {gb.term || "No term"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}