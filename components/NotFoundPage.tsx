"use client";

import { ArrowLeft, Compass, FileText, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NotFoundPage = () => {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000] sm:p-8">
      {/* Abstract Background Elements */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute ml-40 mt-40 h-[500px] w-[500px] rounded-full bg-blue-300/30 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute -ml-40 -mt-20 h-[550px] w-[550px] rounded-full bg-cyan-200/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[560px] rounded-[2.5rem] bg-white/90 px-10 py-12 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl ring-1 ring-gray-100/30 sm:px-14 sm:py-16">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/assets/logo/rfpilot-primary-logo.png"
            alt="RFPilot"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>

        {/* Visual 404 */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <span className="text-[72px] font-extrabold leading-none tracking-tight text-gray-900">
            4
          </span>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Compass className="h-9 w-9 text-primary" strokeWidth={1.75} />
          </span>
          <span className="text-[72px] font-extrabold leading-none tracking-tight text-gray-900">
            4
          </span>
        </div>

        <h1 className="mb-3 text-[26px] font-extrabold tracking-tight text-gray-900">
          This page is off the flight plan.
        </h1>
        <p className="mx-auto mb-10 max-w-sm text-[14px] font-medium leading-relaxed text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been
          moved. Check the address, or head back to somewhere familiar.
        </p>

        {/* Pathways */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0"
            style={{ background: "#222628" }}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            href="/proposals"
            className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0"
          >
            <FileText className="h-4 w-4" />
            <span>View Proposals</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer mx-auto flex items-center gap-1.5 text-[13.5px] font-bold text-gray-400 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go back to the previous page
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
