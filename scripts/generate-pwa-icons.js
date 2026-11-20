/**
 * Generates crisp PWA icon assets in public/icons/
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const ICONS_DIR = path.resolve("public/icons");
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const logoBase64 = fs.readFileSync("public/images/dmi-foundations-logo.png").toString("base64");
const logoDataUri = `data:image/png;base64,${logoBase64}`;

const SIZES = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
];

async function generate() {
  console.log("Generating PWA icons...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  for (const { name, size, maskable } of SIZES) {
    await page.setViewport({ width: size, height: size });
    const padding = maskable ? Math.round(size * 0.15) : Math.round(size * 0.08);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: ${maskable ? "#050A24" : "transparent"};
            }
            .container {
              width: ${size - padding * 2}px;
              height: ${size - padding * 2}px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
            }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${logoDataUri}" alt="Logo" />
          </div>
        </body>
      </html>
    `;

    await page.setContent(html);
    const dest = path.join(ICONS_DIR, name);
    await page.screenshot({ path: dest, omitBackground: !maskable });
    console.log(`Generated: ${dest} (${size}x${size})`);
  }

  await browser.close();
  console.log("PWA Icons generated successfully!");
}

generate();
