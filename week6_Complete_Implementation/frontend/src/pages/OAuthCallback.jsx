import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * OAuth callback landing page.
 * The backend redirects here after a successful Google / GitHub login.
 * We simply refresh the auth state and then redirect to home.
 */
export default function OAuthCallback() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshUser();
      if (!cancelled) navigate("/", { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshUser, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream font-sans">
      <Brain className="h-10 w-10 text-green-primary" />
      <Loader2 className="h-6 w-6 animate-spin text-green-primary" />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}
