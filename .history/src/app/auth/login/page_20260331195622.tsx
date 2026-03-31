"use client";
import { useState, useEffect } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaGithub } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  GithubAuthProvider 
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");

    const { user, loading } = useAuth();
    useEffect(() => {

    if (savedUser) {
       router.push("/"); 
    }
  }, [router]);

  // Social Login Handler
  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'github') => {
    let provider;
    if (providerType === 'google') provider = new GoogleAuthProvider();
    else if (providerType === 'facebook') provider = new FacebookAuthProvider();
    else provider = new GithubAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        if (rememberMe) {
          localStorage.setItem("blinkchat_user", JSON.stringify({ 
            email: result.user.email, 
            uid: result.user.uid 
          }));
        }
        router.replace("/");
        } else {
          setCheckingAuth(false);
        }
      }
    } catch (error) {
      console.error("Social auth failed:", error);
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (rememberMe) {
      localStorage.setItem("blinkchat_user", JSON.stringify({ email, loggedIn: true }));
    }
    router.push("/");
  };

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome Back</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Glad to see you again!</p>
      </div>

      <form className="space-y-5" onSubmit={handleEmailLogin}>
        <div className="space-y-2">
          <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">Email or Phone</label>
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={18} /></div>
             <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text" 
                placeholder="ashish@example.com" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white" 
             />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between px-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <Link href="#" className="text-[10px] text-blue-500 font-bold uppercase">Forgot?</Link>
          </div>
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18} /></div>
             <input type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <input 
            type="checkbox" 
            id="remember" 
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" 
          />
          <label htmlFor="remember" className="text-sm text-gray-500 dark:text-gray-400 font-medium">Keep me logged in</label>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
          <LogIn size={20} /> Sign In
        </button>
      </form>

      <div className="relative my-8 text-center">
        <span className="bg-white dark:bg-slate-900 px-4 text-xs text-gray-400 relative z-10 font-bold uppercase tracking-widest">Or continue with</span>
        <div className="absolute top-1/2 w-full h-[1px] bg-gray-100 dark:bg-slate-800 left-0" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => handleSocialLogin('google')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
          <FcGoogle size={20} />
        </button>
        <button onClick={() => handleSocialLogin('facebook')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
          <FaFacebook size={20} className="text-blue-600" />
        </button>
        <button onClick={() => handleSocialLogin('github')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
          <FaGithub size={20} />
        </button>
      </div>

      <p className="text-center mt-8 text-sm text-gray-500">
        New here? <Link href="/auth/signup" className="text-blue-600 font-bold hover:underline">Create Account</Link>
      </p>
    </div>
  );
}