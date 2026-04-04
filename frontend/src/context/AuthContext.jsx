import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  console.log("🧠 AuthProvider INIT");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session on refresh
  useEffect(() => {
    console.log("🔁 Auth restore running");

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // 🚨 HARD RULE: both must exist
    if (!token || !storedUser) {
      console.warn("⚠️ Incomplete auth state → clearing");

      localStorage.clear();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.warn("⛔ Token expired → clearing");

        localStorage.clear();
        setUser(null);
        setLoading(false);
        return;
      }

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

      localStorage.clear();
      setUser(null);
    }

    setLoading(false);
  }, []);

  // 🔐 LOGIN (🔥 FINAL FIX)
  const login = (user, token) => {
    console.log("🔥 LOGIN DATA RECEIVED:", user);

    // ✅ CORRECT VALIDATION (MATCHES NEW SIGNATURE)
    if (!user || !user.role || !token) {
      console.error("❌ INVALID LOGIN DATA:", { user, token });
      throw new Error("Invalid login data structure");
    }

    setUser(user);

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);

    console.log("🔐 AuthContext.login → stored user:", user);
  };

  // 🚪 Logout
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