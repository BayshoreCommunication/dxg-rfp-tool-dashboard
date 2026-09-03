"use client";

import { useSearchParams } from "next/navigation";
import EmailSend from "./EmailSend";
import TopHeader from "./TopHeader";

const EmailSendBody = () => {
  const searchParams = useSearchParams();
  // A question to one vendor is not a campaign: no "Email Templates &
  // Reminders" banner above it, just the composer.
  const question = searchParams.get("mode") === "question";
  return (
    <div className="space-y-8">
      {!question && <TopHeader />}
      <EmailSend />
    </div>
  );
};

export default EmailSendBody;
