import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { LogIn } from "lucide-react";

export function LoginCard() {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("google");
    } catch (err: any) {
      setError(err?.message || "An error occurred during sign-in.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-[#1e293b]/70 border border-slate-700/50 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-blue-500/30">
      <div className="p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 mb-6 animate-pulse">
          <LogIn className="w-6 h-6 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          TARC Moderation System
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          Sign in using your institutional email address
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/20"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
      <div className="px-8 py-4 bg-[#0f172a]/40 border-t border-slate-700/30 text-center">
        <p className="text-xs text-slate-500">
          Only @tarc.edu.my email accounts are permitted
        </p>
      </div>
    </div>
  );
}
