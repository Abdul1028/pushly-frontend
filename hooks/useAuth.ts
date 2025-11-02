"use client";
import { useEffect, useState } from "react";
import { apiFetch, apiFetchAuth } from "../lib/api";
import { getToken, setToken, clearToken, type AuthUser } from "../lib/auth";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, token: null, status: "loading" });

  useEffect(() => {
    const t = getToken();
    if (!t) return setState((s) => ({ ...s, status: "unauthenticated" }));
    apiFetchAuth<AuthUser>("/api/auth/me", t)
      .then((user) => setState({ user, token: t, status: "authenticated" }))
      .catch(() => {
        clearToken();
        setState({ user: null, token: null, status: "unauthenticated" });
      });
  }, []);

  async function login(email: string, password: string) {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setState({ user: res.user, token: res.token, status: "authenticated" });
  }

  async function register(data: { firstName: string; lastName: string; email: string; password: string }) {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setToken(res.token);
    setState({ user: res.user, token: res.token, status: "authenticated" });
  }

  async function logout() {
    clearToken();
    setState({ user: null, token: null, status: "unauthenticated" });
  }

  return { ...state, login, register, logout };
}


