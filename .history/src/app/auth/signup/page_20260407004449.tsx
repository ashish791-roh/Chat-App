"use client";

import { useState, useEffect } from "react";
import {
  Mail, Lock, ArrowRight, User, AtSign,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaGithub } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signup, isUsernameAvailable } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName]   = useState("");
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // "idle" | "checking" | "available" | "taken" | "invalid"
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // ── Debounced username availability check ─────────────────────────────────
  useEffect(() => {
    const val = username.trim().toLowerCase();

    if (!val) {
      setUsernameStatus("idle");
      return;
    }

    // 3–20 chars, letters / numbers / underscores only
    if (!/^[a-z0-9_]{3,20}$/.test(val)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(val);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [username]);

  // ── Email / password signup ───────────────────────────────────────────────
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usernameStatus !== "available") {
      setError("Please choose a valid, available username.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Uses auth.ts signup — saves name, username, email to Firestore
      await signup(fullName, email, password, username);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Social signup ─────────────────────────────────────────────────────────
  const handleSocialSignup = async (
    providerType: "google" | "facebook" | "github"
  ) => {
    let provider;
    if (providerType === "google")        provider = new GoogleAuthProvider();
    else if (providerType === "facebook") provider = new FacebookAuthProvider();
    else                                  provider = new GithubAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      console.error("Social signup failed:", err);
    }
  };

  // ── Username status hint ──────────────────────────────────────────────────
  const usernameHint = {
    idle:      null,
    checking:  <span className="flex items-center gap-1 text-gray-400"><Loader2 size={11} className="animate-spin" />Checking…</span>,
    available: <span className="flex items-center gap-1 text-green-500"><CheckCircle2 size={11} />@{username.toLowerCase()} is available</span>,
    taken:     <span className="flex items-center gap-1 text-red-500"><XCircle size={11} />Username already taken</span>,
    invalid:   <span className="flex items-center gap-1 text-orange-500"><XCircle size={11} />3–20 chars, letters / numbers / underscores only</span>,
  }[usernameStatus];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Join the BlinkChat community today
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignup}>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={18} />
              </div>
              <input
                required
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ashish Rohilla"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <AtSign size={18} />
              </div>
              <input
                required
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/\s/g, ""))
                }
                placeholder="ashish_rohilla"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
            {usernameHint && (
              <p className="text-[11px] ml-2">{usernameHint}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={18} />
              </div>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ashish@example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2 pb-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 ml-1">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || usernameStatus !== "available"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? "Creating Account…" : "Sign Up"}
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="relative my-8 text-center">
          <span className="bg-white dark:bg-slate-900 px-4 text-xs text-gray-400 relative z-10 font-bold uppercase tracking-widest">
            Or continue with
          </span>
          <div className="absolute top-1/2 w-full h-[1px] bg-gray-100 dark:bg-slate-800 left-0" />
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleSocialSignup("google")}
            className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700"
          >
            <FcGoogle size={20} />
          </button>
          <button
            onClick={() => handleSocialSignup("facebook")}
            className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700"
          >
            <FaFacebook size={20} className="text-[#1877F2]" />
          </button>
          <button
            onClick={() => handleSocialSignup("github")}
            className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700"
          >
            <FaGithub size={20} className="dark:text-white" />
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}