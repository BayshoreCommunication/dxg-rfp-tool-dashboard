import { redirect } from "next/navigation";

// Password sign-in is gone (Google, Microsoft or company SSO only), so there
// is no password to reset. Old links land on sign-in.
const page = () => redirect("/sign-in");

export default page;
