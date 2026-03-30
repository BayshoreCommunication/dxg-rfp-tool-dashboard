import EmailSendBody from "@/components/Email/EmailSendBody";
import { Suspense } from "react";

const Page = () => {
  return (
    <Suspense
      fallback={<div className="px-6 py-8 text-sm text-slate-400">Loading...</div>}
    >
      <div>
        <EmailSendBody />
      </div>
    </Suspense>
  );
};

export default Page;
