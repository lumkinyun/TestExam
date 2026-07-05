import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";

export function PendingCard() {
  const { signOut } = useAuthActions();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-[#1e293b]/70 border border-slate-700/50 backdrop-blur-xl shadow-2xl transition-all duration-300">
      <div className="p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-6">
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          Account Pending Activation
        </h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Your account has been registered successfully. An administrator must activate your profile before you can access the system.
        </p>

        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm border border-slate-700 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
      <div className="px-8 py-4 bg-[#0f172a]/40 border-t border-slate-700/30 text-center">
        <p className="text-xs text-slate-500">
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
