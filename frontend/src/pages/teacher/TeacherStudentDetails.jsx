import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";

export default function TeacherStudentDetails() {
  const { id } = useParams();
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/teacher/student/${id}/gradebook`);
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
    }
  };

  return (
    <div>
      <h2>Student Gradebook</h2>

      {data.length === 0 ? (
        <p>No assignments found</p>
      ) : (
        data.map((item, index) => (
          <div key={index}>
            {item.title} — {item.score}
          </div>
        ))
      )}
    </div>
  );
}