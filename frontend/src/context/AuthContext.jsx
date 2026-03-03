import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        setUser({
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          role: parsed.role,
          forcePasswordChange: parsed.forcePasswordChange || false,
        });

        setIsAuthenticated(true);
      } catch (err) {
        console.error("Corrupt user in storage:", err);
        localStorage.removeItem("user");
      }
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
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));

    console.log("🔐 AuthContext.login → stored user:", userData);
  };

  // 🚪 Logout
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  // 🔁 Clear force flag after successful password change
  const clearForcePasswordFlag = () => {
    if (!user) return;

    const updatedUser = {
      ...user,
      forcePasswordChange: false,
    };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

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