import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";

const SignupPage = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 sm:p-8">
      {/* Abstract Background Elements */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute ml-40 mt-40 h-[500px] w-[500px] rounded-full bg-blue-300/30 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute -ml-40 -mt-20 h-[550px] w-[550px] rounded-full bg-cyan-200/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1000px] overflow-hidden rounded-[2.5rem] bg-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur-2xl ring-1 ring-black/5 sm:min-h-[640px]">
        {/* Left Side: Branding / Showcase */}
        <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-white lg:flex relative overflow-hidden">
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          {/* Top Logo */}
          <div className="relative z-10 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-lg shadow-black/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight">Company Name</span>
          </div>

          {/* Value Proposition */}
          <div className="relative z-10 max-w-sm">
            <h2 className="mb-6 text-[32px] font-extrabold leading-tight tracking-tight">
              Start creating winning proposals today.
            </h2>
            <div className="space-y-5">
              {[
                "Access beautiful, professional templates",
                "Close deals 40% faster on average",
                "Track when clients open your proposals",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-[15px] font-medium text-white/90">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Bottom attribution */}
          <div className="relative z-10 text-sm font-medium text-white/50">
            © 2026 Company Name Inc.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex w-full flex-col justify-center bg-white px-8 py-16 sm:px-16 lg:w-1/2">
          <div className="mx-auto w-full max-w-sm">
            {/* Mobile Logo Logo */}
            <div className="mb-10 flex items-center justify-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-black">
                Company Name
              </span>
            </div>

            {/* Headers */}
            <div className="mb-10 lg:text-left text-center">
              <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
                Create an account
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Join thousands of businesses sending better proposals.
              </p>
            </div>

            {/* Email Input group */}
            <div className="mb-6 group">
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
                />
              </div>
            </div>

            {/* Primary Action */}
            <button className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-black py-4 text-[15px] font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98]">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 -translate-x-full bg-white/20 blur-md transition-transform duration-500 group-hover:translate-x-full"></div>
            </button>

            {/* Divider */}
            <div className="mb-8 flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-200"></div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Or continue with
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-200"></div>
            </div>

            {/* Google Signup */}
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
            <p className="text-center text-[13px] font-medium text-gray-500">
              By continuing, you agree to our{" "}
              <Link href="#" className="font-bold underline decoration-gray-300 underline-offset-2 hover:text-black hover:decoration-black transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="font-bold underline decoration-gray-300 underline-offset-2 hover:text-black hover:decoration-black transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
            
            <p className="mt-8 mb-4 lg:mb-0 text-center text-[14px] font-bold text-gray-900 lg:hidden">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
