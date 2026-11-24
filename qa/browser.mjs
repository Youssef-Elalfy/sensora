import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { join } from "node:path";
export async function openBrowser({ software = true } = {}) {
  const candidate =
    process.env.SENSORA_CHROMIUM_PATH ||
    (process.platform === "win32"
      ? join(
          process.env.LOCALAPPDATA,
          "ms-playwright",
          "chromium-1248",
          "chrome-win64",
          "chrome.exe",
        )
      : "");
  return chromium.launch({
    executablePath: existsSync(candidate) ? candidate : undefined,
    headless: true,
    args: [
      "--enable-unsafe-swiftshader",
      ...(software ? ["--use-angle=swiftshader"] : []),
      "--disable-dev-shm-usage",
    ],
  });
}
export const url = process.env.SENSORA_QA_URL || "http://127.0.0.1:3157";
