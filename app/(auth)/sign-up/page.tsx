import SignupPage from "@/components/auth/SignupPage";
import { readGoogleDomainMatch } from "@/lib/server/twoFactorPending";

// ORG-306: Google sign-up on a verified organization domain lands here with
// ?step=organization-match; the email and organization name are in an
// encrypted cookie the Google callback set.
const page = async ({ searchParams }: { searchParams: Promise<{ step?: string }> }) => {
  const { step } = await searchParams;
  const googleMatch = step === "organization-match" ? await readGoogleDomainMatch() : null;
  return (
    <div>
      <SignupPage googleMatch={googleMatch} />
    </div>
  );
};

export default page;
