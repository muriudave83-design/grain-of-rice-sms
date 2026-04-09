import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/teacher/classes");
      setClasses(res.data || []);
    } catch (err) {
      console.error(err);
      setClasses([]);
    }
  };

  return (
    <div className="p-6">
      {/* 🔥 HEADER WITH GUIDANCE */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">My Classes</h2>
        <p className="text-gray-500 text-sm">
          Select a class to view students and create assignments
        </p>
      </div>

      {/* 🔥 EMPTY STATE */}
      {classes.length === 0 ? (
        <div className="text-gray-500">No classes assigned</div>
      ) : (
        /* 🔥 CARD GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => navigate(`/teacher/class/${cls.id}`)}
              className="cursor-pointer border rounded-xl p-5 bg-white hover:bg-blue-50 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {cls.name}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    View students & manage assignments
                  </p>
                </div>

                {/* 👉 visual cue */}
                <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition text-xl">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}