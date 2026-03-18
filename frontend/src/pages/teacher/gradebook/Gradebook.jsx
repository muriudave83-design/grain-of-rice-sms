import { useEffect, useState } from "react";
import axios from "axios";

export default function Gradebook() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(
        "https://sms-backend-1w30.onrender.com/api/gradebook?classId=1&subjectId=1&termId=1"
      )
      .then((res) => {
        console.log("GRADEBOOK DATA:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load gradebook");
      });
  }, []);

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!data) return <div className="p-4">Loading gradebook...</div>;

  const { students = [], assessments = [] } = data;

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl mb-4">Gradebook</h2>

      <table className="border border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-2">Student</th>

            {assessments.map((a) => (
              <th key={a.id} className="border p-2">
                {a.title}
              </th>
            ))}

            <th className="border p-2">Avg</th>
            <th className="border p-2">Missing</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td className="border p-2">{student.name}</td>

              {assessments.map((a) => {
                const score = student.scores?.[a.id];

                return (
                  <td key={a.id} className="border p-2 text-center">
                    {score ?? "-"}
                  </td>
                );
              })}

              <td className="border p-2 text-center">
                {student.average != null
                  ? (student.average * 100).toFixed(0) + "%"
                  : "-"}
              </td>

              <td className="border p-2 text-center">
                {student.missingCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}