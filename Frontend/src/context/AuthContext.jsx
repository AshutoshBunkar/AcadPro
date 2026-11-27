import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { AuthContext, TOKEN_KEY, ROLE_KEY, USER_KEY } from "./authContext";

export function AuthProvider({ children }) {
  const cache = useQueryClient();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    for (const key of [TOKEN_KEY, ROLE_KEY, USER_KEY]) localStorage.removeItem(key);
    api.get("/account/session").then(({data}) => { if (live) setSession(data); })
      .catch(() => {}).finally(() => { if (live) setLoading(false); });
    const interceptor = api.interceptors.response.use(response => response, error => {
      if (error.response?.status === 401 && !error.config?.url?.endsWith("/login")) {
        setSession(null);
        cache.clear();
      }
      return Promise.reject(error);
    });
    return () => { live = false; api.interceptors.response.eject(interceptor); };
  }, [cache]);
  const login = useCallback((role, data) => {
    cache.clear();
    setSession({ role, user: data[role] });
  }, [cache]);
  const logout = useCallback(async () => {
    await api.post("/account/logout");
    cache.clear(); setSession(null);
  }, [cache]);
  return <AuthContext.Provider value={{ ...session, isAuthenticated: Boolean(session), loading, login, logout }}>
    {children}
  </AuthContext.Provider>;
}
