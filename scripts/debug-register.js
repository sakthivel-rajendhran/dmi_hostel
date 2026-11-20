import puppeteer from "puppeteer";

async function check() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => console.log("CONSOLE:", msg.text()));

  await page.goto("http://localhost:3000/register", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 2000));
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("PAGE TITLE:", title);
  console.log("BODY TEXT SAMPLE:", bodyText.slice(0, 300));
  await browser.close();
}

check();
