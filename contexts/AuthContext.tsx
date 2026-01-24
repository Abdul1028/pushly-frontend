"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { getToken, setToken as saveToken, clearToken, type AuthUser } from "@/lib/auth";

type AuthState = {
    user: AuthUser | null;
    token: string | null;
    status: "loading" | "authenticated" | "unauthenticated";
};

type AuthContextType = AuthState & {
    login: (email: string, password: string) => Promise<void>;
    register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        status: "loading",
    });

    // Fetch user data on mount (runs ONCE for entire app)
    useEffect(() => {
        const fetchUser = async () => {
            const t = getToken();
            if (!t) {
                setState((s) => ({ ...s, status: "unauthenticated" }));
                return;
            }

            try {
                // This will work with localStorage now, cookies later
                const user = await apiFetch<AuthUser>("/api/auth/me", {
                    headers: {
                        Authorization: `Bearer ${t}`,
                    },
                    // Ready for cookies: just uncomment this when backend is ready
                    // credentials: 'include',
                });
                setState({ user, token: t, status: "authenticated" });
            } catch (error) {
                clearToken();
                setState({ user: null, token: null, status: "unauthenticated" });
            }
        };

        fetchUser();
    }, []); // Empty deps = runs ONCE when provider mounts

    async function login(email: string, password: string) {
        const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        saveToken(res.token);
        setState({ user: res.user, token: res.token, status: "authenticated" });
    }

    async function register(data: { firstName: string; lastName: string; email: string; password: string }) {
        const res = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
        saveToken(res.token);
        setState({ user: res.user, token: res.token, status: "authenticated" });
    }

    async function logout() {
        clearToken();
        setState({ user: null, token: null, status: "unauthenticated" });
    }

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
