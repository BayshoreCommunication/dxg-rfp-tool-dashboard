import { notFound } from "next/navigation";
import { getVendorListAccessAction } from "@/app/actions/vendorList";
import VendorListSettings from "@/components/organization/vendors/VendorListSettings";

// ORG-607. A Viewer has no access to the vendor list, so the page does not exist for them.
export default async function SettingsVendorsPage() {
  const access = await getVendorListAccessAction();
  if (!access.canRead) notFound();
  return <VendorListSettings canEdit={access.canEdit} />;
}
