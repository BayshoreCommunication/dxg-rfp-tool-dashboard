import { auth } from "@/auth";
import { generateProposalPdf } from "@/lib/server/proposalPdf";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PROPOSAL_PATH = /^\/(proposal|proposal-view)\/[a-z0-9-]+(?:\?.*)?$/i;

const safeFilename = (value: unknown) => {
  const filename = typeof value === "string" ? value : "proposal-rfp.pdf";
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return sanitized.toLowerCase().endsWith(".pdf")
    ? sanitized
    : `${sanitized}.pdf`;
};

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  const filename = req.nextUrl.searchParams.get("filename");
  if (!path || !PROPOSAL_PATH.test(path)) {
    return new Response("Invalid proposal path", { status: 400 });
  }

  const target = new URL(path, req.nextUrl.origin);
  if (target.origin !== req.nextUrl.origin) {
    return new Response("Invalid proposal URL", { status: 400 });
  }

  if (target.pathname.startsWith("/proposal/")) {
    const session = await auth();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });
  }

  try {
    const pdf = await generateProposalPdf({
      url: target.toString(),
      cookie: req.headers.get("cookie") || undefined,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Proposal PDF generation failed:", error);
    return new Response("PDF could not be generated", { status: 500 });
  }
}
