import { chromium as playwright } from "@playwright/test";
export async function launchBrowser() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    const { default: chromium } = await import("@sparticuz/chromium");
    return playwright.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
      args: chromium.args.filter((a) => !["--disable-web-security", "--single-process"].includes(a)),
    });
  }
  if (process.env.USE_SPARTICUZ === "true") {
    const { default: chromium } = await import("@sparticuz/chromium");
    return playwright.launch({
      headless: true,
      executablePath: await chromium.executablePath(),
      args: chromium.args.filter((a) => !["--disable-web-security", "--single-process"].includes(a)),
    });
  }
  return playwright.launch({ headless: true });
}
