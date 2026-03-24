import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ParentReportCards() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🔥 Always redirect back to dashboard
    navigate("/parent", { replace: true });
  }, [navigate]);

  return null;
}