import { notFound } from "next/navigation";
import { getTemplateAccessAction } from "@/app/actions/proposalTemplates";
import TemplateListSettings from "@/components/organization/templates/TemplateListSettings";

// ORG-605. A Viewer can't use RFP templates, so the page does not exist for them.
export default async function SettingsTemplatesPage() {
  const access = await getTemplateAccessAction();
  if (!access.canUse) notFound();
  return <TemplateListSettings access={access} />;
}
