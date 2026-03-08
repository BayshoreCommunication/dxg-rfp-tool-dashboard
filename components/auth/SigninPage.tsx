"use client"

import { ArrowRight, Check, Eye, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const SigninPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000]">


      {/* 
        The main card: 
        Elevated with a very soft, diffuse shadow and a delicate glass-like border. 
      */}
      <div className="relative z-10 w-full max-w-[460px] rounded-[2.5rem] bg-white/90 px-10 py-12 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl ring-1 ring-gray-100/30 sm:px-14 sm:py-16">
        
        {/* Logo Section */}
        <div className="mb-6 flex justify-center">
            <h3 className="text-primary text-2xl font-bold">
               Logo.
            </h3>
        </div>

        {/* Header Section */}
        <h2 className="mb-3 text-center text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">
          Welcome Back
        </h2>
        <p className="mb-10 text-center text-[14px] font-medium text-gray-400">
          Enter your details to access your account
        </p>

        {/* Input Fields Container */}
        <div className="space-y-4 mb-6">
          {/* Email Input */}
          <div className="mb-0 group">
            <label className="mb-2 block text-[13px] font-bold text-gray-700">
              Email Address
            </label>
            <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
              <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                type="email"
                placeholder="name@company.com"
                className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
                defaultValue=""
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="group">
            <label className="mb-2 block text-[13px] font-bold text-gray-700">
              Password
            </label>
            <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
              <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
                <KeyRound className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
                defaultValue=""
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 flex items-center justify-center text-gray-400 hover:text-primary transition-colors focus:outline-none"
              >
                <Eye className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="mb-8 flex items-center justify-between px-2">
          <label className="flex cursor-pointer items-center gap-2.5 group">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-[6px] border-[1.5px] transition-all duration-300 ${
                rememberMe
                  ? "border-primary bg-primary shadow-[0_2px_8px_rgba(45,198,245,0.3)]"
                  : "border-gray-200 bg-white group-hover:border-gray-300"
              }`}
              onClick={() => setRememberMe(!rememberMe)}
            >
              <Check
                className={`h-3 w-3 text-white transition-transform duration-300 ${
                  rememberMe ? "scale-100 opacity-100" : "scale-50 opacity-0"
                }`}
                strokeWidth={4}
              />
            </div>
            <span className="text-[13.5px] font-bold text-gray-500 select-none group-hover:text-gray-700 transition-colors">
              Remember me
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-[13.5px] font-bold text-primary hover:text-blue-500 transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Primary Action Button */}
        <button className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-black py-4 text-[15px] font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98]">
          <span>Sign In to Dashboard</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          <div className="absolute inset-0 -translate-x-full bg-white/20 blur-md transition-transform duration-500 group-hover:translate-x-full"></div>
        </button>

        {/* Divider */}
        <div className="mb-8 flex items-center gap-4 px-2">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-200 to-gray-200"></div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-300">
            Or continue with
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-gray-200 to-gray-200"></div>
        </div>

        {/* Google Login Button */}
    <button className="cursor-pointer mb-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-3.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] active:translate-y-0">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-[14px] font-bold text-gray-700">
                Google
              </span>
            </button>

        {/* Footer */}
        <p className="text-center text-[13.5px] font-bold text-gray-400">
          New to Proposify?{" "}
          <Link href="/sign-up" className="text-primary hover:text-blue-500 transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SigninPage;
