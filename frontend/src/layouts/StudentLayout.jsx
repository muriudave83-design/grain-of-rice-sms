import { Outlet } from "react-router-dom";

const StudentLayout = () => {
  return (
    <div style={{ background: "#111", minHeight: "100vh" }}>
      <Outlet />
    </div>
  );
};

export default StudentLayout;