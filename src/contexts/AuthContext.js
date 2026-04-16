import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const raw = await AsyncStorage.getItem("auth_tokens");
        if (raw) {
          const tokens = JSON.parse(raw);
          setUserId(tokens.userId || null);
          setAccessToken(tokens.accessToken || null);
        }
      } catch (e) {
        console.log("[AuthContext] Failed to load tokens:", e.message);
      } finally {
        setLoading(false);
      }
    };
    loadTokens();
  }, []);

  const updateAuth = (newUserId, newToken) => {
    setUserId(newUserId);
    setAccessToken(newToken);
  };

  const clearAuth = () => {
    setUserId(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ userId, accessToken, loading, updateAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
