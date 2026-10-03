import { useState, type ChangeEvent } from "react";
import supabase from "../../config/supabaseClient";
import Overlay from "../common/Overlay";
import Field from "../common/Field";
import ModalHeader from "../common/ModalHeader";
import { signInWithGoogle } from "../../services/authService";
import { Icon } from "../common/Icon";

export default function RegisterModal({ onClose, onSwitch }: { onClose: () => void; onSwitch: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg("");

    // 1. Register account in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
          gender: gender,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }


    setLoading(false);
    alert("Registration successful! Check your email to confirm your account.");
    onClose();
  };

  return (
    <Overlay onClose={onClose} contentClassName="max-w-lg">
      <ModalHeader title="Create Account" onClose={onClose} />
      <div className="px-6 pb-6 pt-3 space-y-3">
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        <Field label="Full Name" placeholder="e.g. Maria Santos" value={fullName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)} />
        <Field label="Username" placeholder="Choose a unique username" value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} />
        <Field label="Email Address" type="email" placeholder="your@email.com" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        <Field label="Password" type="password" placeholder="Minimum 6 characters" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} />

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {(["Male", "Female"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGender(option)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${gender === option ? "border-[#0b1f5c] bg-[#0b1f5c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
              >
                <Icon name={option === "Male" ? "male" : "female"} size={16} />
                {option}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">Used only to choose your default profile avatar. Google accounts use their Google profile photo when available.</p>
        </div>
        
        <button 
          onClick={handleRegister} 
          disabled={loading || !email || !password || password.length < 6 || !gender}
          className="w-full bg-[#0b1f5c] text-white font-semibold py-3 rounded-xl hover:bg-[#162d7a] transition-all text-sm disabled:opacity-40"
        >
          {loading ? "Registering..." : "Create Account"}
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
          Already registered? <button onClick={onSwitch} className="text-slate-700 font-semibold hover:underline">Sign in</button>
        </p>
      </div>
    </Overlay>
  );
}

