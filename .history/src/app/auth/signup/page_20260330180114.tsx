"use client";
import { useState } from "react";
import { Mail, Phone, Lock, ArrowRight, User } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaGithub } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  
  // State for Form Inputs
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Email/Password Signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update the user's profile with their Full Name
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      console.log("Signup successful!");
      router.push("/"); // Redirect to dashboard/home
    } catch (error: any) {
      console.error("Signup error:", error.message);
      alert(error.message); // You can replace this with a toast notification later
    } finally {
      setLoading(false);
    }
  };

  // Handle Social Signups (Google, Facebook, GitHub)
  const handleSocialSignup = async (providerType: 'google' | 'facebook' | 'github') => {
    let provider;
    if (providerType === 'google') provider = new GoogleAuthProvider();
    else if (providerType === 'facebook') provider = new FacebookAuthProvider();
    else provider = new GithubAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error) {
      console.error("Social signup failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create Account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Join the BlinkChat community today</p>
        </div>

        {/* Method Switcher */}
        <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl mb-6">
          <button 
            type="button"
            onClick={() => setMethod("email")} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${method === "email" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-gray-500"}`}
          >
            Email
          </button>
          <button 
            type="button"
            onClick={() => setMethod("phone")} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${method === "phone" ? "bg-white dark:bg-slate-700 shadow-sm" : "text-gray-500"}`}
          >
            Phone
          </button>
        </div>

        {/* Form Section */}
        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div className="space-y-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><User size={18} /></div>
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

          <div className="space-y-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">
              {method === "email" ? "Email Address" : "Phone Number"}
            </label>
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {method === "email" ? <Mail size={18} /> : <Phone size={18} />}
               </div>
               <input 
                required
                type={method === "email" ? "email" : "tel"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={method === "email" ? "ashish@example.com" : "+91 00000 00000"} 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 ring-blue-500 outline-none transition-all dark:text-white" 
               />
            </div>
          </div>

          <div className="space-y-2 pb-2">
            <label className="text-xs font-bold ml-1 text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18} /></div>
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

          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? "Creating Account..." : "Sign Up"} <ArrowRight size={20} />
          </button>
        </form>

        <div className="relative my-8 text-center">
          <span className="bg-white dark:bg-slate-900 px-4 text-xs text-gray-400 relative z-10 font-bold uppercase tracking-widest">Or continue with</span>
          <div className="absolute top-1/2 w-full h-[1px] bg-gray-100 dark:bg-slate-800 left-0" />
        </div>

        {/* Social Signups */}
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => handleSocialSignup('google')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
            <FcGoogle size={20} />
          </button>
          <button onClick={() => handleSocialSignup('facebook')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
            <FaFacebook size={20} className="text-[#1877F2]" />
          </button>
          <button onClick={() => handleSocialSignup('github')} className="flex justify-center py-3 bg-gray-50 dark:bg-slate-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all border dark:border-slate-700">
            <FaGithub size={20} className="dark:text-white" />
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-gray-500">
          Already have an account? <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}