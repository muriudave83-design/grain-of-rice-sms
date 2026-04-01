import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  console.log("🧠 AuthProvider INIT");

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // ✅ NEW
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session on refresh (FIXED)
  useEffect(() => {
    console.log("🔁 Auth restore running");

    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      // 🔥 Decode token
      const payload = JSON.parse(atob(storedToken.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.warn("⛔ Token expired → clearing session");

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        setLoading(false);
        return;
      }

      // ✅ Set token FIRST
      setToken(storedToken);

      // ✅ Restore user if exists
      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        setUser({
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          role: parsed.role,
          forcePasswordChange: parsed.forcePasswordChange || false,
        });
      } else {
        console.warn("⚠️ Token exists but no user found");
      }

    } catch (err) {
      console.error("⚠️ Corrupt session → clearing:", err);

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    }

    setLoading(false);
  }, []);

  // 🔐 Login (FIXED)
  const login = (data) => {
    console.log("🔥 LOGIN DATA RECEIVED:", data);

    const userData = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      forcePasswordChange: data.user.forcePasswordChange || false,
    };

    // ✅ CRITICAL: store token HERE (no race conditions)
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    setToken(data.token);
    setUser(userData);

    console.log("🔐 AuthContext.login → stored:", {
      token: data.token,
      user: userData,
    });
  };

  // 🚪 Logout (HARD RESET)
  const logout = () => {
    console.log("🚪 Logging out...");

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    setUser(null);
    setToken(null);

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

  const isAuthenticated = !!token; // ✅ FIXED (was user before)

  return (
    <AuthContext.Provider
      value={{
        user,
        token, // ✅ expose token
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