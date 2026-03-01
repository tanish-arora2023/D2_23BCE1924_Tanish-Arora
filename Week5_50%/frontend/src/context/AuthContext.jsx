import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session

  // On mount (and after OAuth redirect), ask the server who's logged in
  const fetchUser = useCallback(async () => {
    try {
      const data = await authAPI.currentUser();
      setUser(data.user ?? data); // backend may wrap in { user }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  /** Call after a successful login / register response */
  const setSession = (userData) => setUser(userData);

  /** POST /api/auth/logout then clear local state */
  const signOut = async () => {
    try {
      await authAPI.logout();
    } catch {
      /* even if server errors, clear client state */
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        setSession,
        signOut,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
