import { chromium } from "playwright";

const url = "http://localhost:4173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500); // fonts + first morph settle

const shots = [
  ["hero", 0],
  ["about", 1],
  ["experience", 2],
  ["projects", 3],
  ["contact", 4],
];
const ids = ["hero", "about", "experience", "projects", "contact"];
for (let i = 0; i < ids.length; i++) {
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: "center", behavior: "instant" }), ids[i]);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `shots/${i}-${shots[i][0]}.png` });
}

// mid-morph shot: halfway between hero and about
await page.evaluate(() => {
  const a = document.getElementById("hero"), b = document.getElementById("about");
  const mid = (a.offsetTop + a.offsetHeight / 2 + b.offsetTop + b.offsetHeight / 2) / 2;
  window.scrollTo({ top: mid - innerHeight / 2, behavior: "instant" });
});
await page.waitForTimeout(700);
await page.screenshot({ path: "shots/5-midmorph.png" });

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
mob.on("pageerror", (e) => errors.push(`mobile pageerror: ${e.message}`));
await mob.goto(url, { waitUntil: "networkidle" });
await mob.waitForTimeout(2200);
await mob.screenshot({ path: "shots/6-mobile-hero.png" });

console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "NO JS ERRORS");
await browser.close();
