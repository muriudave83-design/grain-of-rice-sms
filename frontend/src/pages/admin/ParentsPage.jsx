import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

const ParentsPage = () => {
  const navigate = useNavigate();

  // ✅ STATE
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH FUNCTION
  const fetchParents = async () => {
    try {
      const res = await apiClient.get("/admin/parents");
      console.log("PARENTS RESPONSE:", res.data);
      setParents(res.data);
    } catch (error) {
      console.error("FETCH PARENTS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOAD ON PAGE OPEN
  useEffect(() => {
    fetchParents();
  }, []);

  // 🔥 UNLINK HANDLER (NEW)
  const handleUnlink = async (parentId, studentId) => {
    try {
      await apiClient.delete("/admin/unlink-student", {
        data: { parentId, studentId },
      });

      // ✅ Optimistic UI update (no reload)
      setParents((prev) =>
        prev.map((p) =>
          p.id === parentId
            ? {
                ...p,
                children: p.children.filter((c) => c.id !== studentId),
              }
            : p
        )
      );
    } catch (error) {
      console.error("UNLINK ERROR:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Parents</h1>

        <button
          onClick={() => navigate("/dashboard/admin/parents/new")}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          + Add Parent
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Children</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan="5">
                  Loading...
                </td>
              </tr>
            ) : parents.length === 0 ? (
              <tr>
                <td className="p-3" colSpan="5">
                  No parents found
                </td>
              </tr>
            ) : (
              parents.map((parent) => (
                <tr key={parent.id} className="border-t">
                  <td className="p-3">{parent.name}</td>
                  <td>{parent.email}</td>
                  <td>{parent.phone}</td>

                  {/* 🔥 UPDATED CHILDREN COLUMN */}
                  <td>
                    {parent.children?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {parent.children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-2"
                          >
                            <span>{child.firstName}</span>

                            <button
                              onClick={() =>
                                handleUnlink(parent.id, child.id)
                              }
                              className="text-red-500 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        navigate(`/dashboard/admin/parents/${parent.id}`)
                      }
                      className="text-blue-600"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParentsPage;