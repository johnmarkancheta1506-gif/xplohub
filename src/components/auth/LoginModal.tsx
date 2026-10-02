import { useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import { ensureUserInfo, signInWithGoogle } from "../../services/authService";

export default function LoginModal({ onClose, onSwitch, onLogin }: { onClose: () => void; onSwitch: () => void; onLogin: (userId: string) => void }) {
  const [emailInput, setEmailInput]       = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loading, setLoading]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");

    // Authenticate user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        await ensureUserInfo(data.user);
      } catch (profileError: any) {
        setErrorMsg(profileError?.message || "Your account could not be initialized.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onLogin(data.user.id); // Pass the authenticated user ID to App
      onClose();  // Closes the modal
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Sign In" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        <Field 
          label="Email Address" 
          type="email" 
          placeholder="your@email.com" 
          value={emailInput} 
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmailInput(e.target.value)} 
        />
        <Field 
          label="Password" 
          type="password" 
          placeholder="Your password" 
          value={passwordInput} 
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordInput(e.target.value)} 
        />
        <button 
          onClick={handleSignIn} 
          disabled={loading || !emailInput || !passwordInput}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setErrorMsg("");

            const { error } = await signInWithGoogle();

            if (error) {
              setErrorMsg(error.message);
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full border border-slate-200 bg-white text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm disabled:opacity-40 flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.19 2.91-7.42Z"/>
            <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"/>
            <path fill="#FBBC05" d="M6.54 13.84A5.85 5.85 0 0 1 6.23 12c0-.64.11-1.26.31-1.84V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.52Z"/>
            <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.2 14.63 2.25 12 2.25A9.75 9.75 0 0 0 3.3 7.64l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/>
          </svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-slate-400">
          No account? <button onClick={onSwitch} className="text-slate-700 font-semibold hover:underline">Register free</button>
        </p>
      </div>
    </Overlay>
  );
}

