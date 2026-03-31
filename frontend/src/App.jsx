import React, { useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";

export default function App() {

  useEffect(() => {
    console.log("📦 App mounted");

    const originalRemove = localStorage.removeItem;
    const originalClear = localStorage.clear;

    localStorage.removeItem = function (key) {
      console.warn("⚠️ localStorage.removeItem CALLED:", key);
      return originalRemove.apply(this, arguments);
    };

    localStorage.clear = function () {
      console.warn("💣 localStorage.clear CALLED");
      return originalClear.apply(this, arguments);
    };
  }, []);

  return <AppRoutes />;
}