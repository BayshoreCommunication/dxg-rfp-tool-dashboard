import chromium from "@sparticuz/chromium";
import { access } from "node:fs/promises";
import puppeteer, { type Browser } from "puppeteer-core";

const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

const localChromePath = async () => {
  const configured = process.env.CHROME_EXECUTABLE_PATH?.trim();
  const candidates = configured
    ? [configured, ...LOCAL_CHROME_PATHS]
    : LOCAL_CHROME_PATHS;

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known browser location.
    }
  }
  throw new Error(
    "Chrome is not installed. Set CHROME_EXECUTABLE_PATH for local PDF generation.",
  );
};

const launchBrowser = async (): Promise<Browser> => {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return puppeteer.launch({
    args: isServerless ? chromium.args : [],
    executablePath: isServerless
      ? await chromium.executablePath()
      : await localChromePath(),
    headless: true,
  });
};

export const generateProposalPdf = async ({
  url,
  cookie,
}: {
  url: string;
  cookie?: string;
}) => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(".rfp-root .page", { timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      const pendingImages = Array.from(document.images).filter(
        (image) => !image.complete,
      );
      await Promise.race([
        Promise.all(
          pendingImages.map(
            (image) =>
              new Promise<void>((resolve) => {
                if (image.complete) return resolve();
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
          ),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
      ]);
    });
    await page.emulateMediaType("print");
    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      waitForFonts: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
};
