import { useNavigate } from "react-router-dom";

export default function BackButton({ label = "← Back" }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="mb-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
    >
      {label}
    </button>
  );
}