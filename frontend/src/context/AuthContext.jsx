import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  console.log("🧠 AuthProvider INIT");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session on refresh (FIXED)
  useEffect(() => {
    console.log("🔁 Auth restore running");

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // ✅ Only block if NO token
    if (!token) {
      setLoading(false);
      return;
    }

    // ⚠️ If user missing, DO NOT wipe session
    if (!storedUser) {
      console.warn("⚠️ No stored user, but token exists — keeping session");
      setLoading(false);
      return;
    }

    try {
      // 🔥 DECODE TOKEN
      const payload = JSON.parse(atob(token.split(".")[1]));

      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.warn("⛔ Token expired on load → clearing session");

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        setLoading(false);
        return;
      }

      // ✅ VALID TOKEN → restore user
      const parsed = JSON.parse(storedUser);

      setUser({
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        forcePasswordChange: parsed.forcePasswordChange || false,
      });

    } catch (err) {
      console.error("⚠️ Corrupt session → clearing:", err);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    }

    setLoading(false);
  }, []);

  // 🔐 Login
  const login = (data) => {
    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      forcePasswordChange: data.forcePasswordChange || false,
    };

    setUser(userData);

    localStorage.setItem("user", JSON.stringify(userData));

    console.log("🔐 AuthContext.login → stored user:", userData);
  };

  // 🚪 Logout (HARD RESET)
  const logout = () => {
    console.log("🚪 Logging out...");

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    setUser(null);

    window.location.href = "/login";
  };

  // 🔁 Clear force flag
  const clearForcePasswordFlag = () => {
    if (!user) return;

    const updatedUser = {
      ...user,
      forcePasswordChange: false,
    };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        clearForcePasswordFlag,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}