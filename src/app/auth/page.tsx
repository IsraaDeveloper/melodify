"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Music, Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { loginWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created!");
      }
      router.push("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-x-2 mb-8">
        <div className="bg-primary p-2 rounded-full">
          <Music size={24} className="text-black" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">Melodify</span>
      </div>

      <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-white/5 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Log in to Melodify" : "Sign up for Melodify"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase mb-1 block">Email address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition text-white"
              placeholder="name@domain.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase mb-1 block">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary transition text-white"
              placeholder="Password"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition disabled:opacity-50 disabled:scale-100 mt-2 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-text-muted">Or continue with</span>
          </div>
        </div>

        <button 
          onClick={loginWithGoogle}
          className="w-full bg-white text-black font-bold py-3 rounded-full hover:scale-105 transition flex items-center justify-center gap-x-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
          Google
        </button>

        <p className="text-center mt-8 text-sm text-text-muted">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-white hover:underline font-semibold"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
