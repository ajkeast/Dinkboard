/**
 * Capture portfolio screenshots for docs/screenshots/ (1280×720).
 *
 * Usage (API + client already running):
 *   node e2e/capture-readme-screenshots.mjs
 *
 * Env:
 *   DINK_BASE  client origin (default http://localhost:3000)
 *   DINK_API   API origin    (default http://localhost:5001)
 */
import { chromium } from "@playwright/test";
import { mkdirSync, statSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs/screenshots");
const BASE = process.env.DINK_BASE || "http://localhost:3000";
const API = (process.env.DINK_API || "http://localhost:5001").replace(/\/$/, "");

const VIEWPORT = { width: 1280, height: 720 };

const PUBLIC_SHOTS = [{ file: "login.png", path: "/login" }];

const AUTH_SHOTS = [
  { file: "dashboard.png", path: "/dashboard" },
  { file: "messages.png", path: "/messages" },
  { file: "members.png", path: "/members" },
  { file: "emojis.png", path: "/emojis" },
  { file: "ai.png", path: "/ai" },
  { file: "economy.png", path: "/economy" },
  { file: "firsts.png", path: "/firsts" },
  { file: "juice.png", path: "/juice" },
];

const stamp = Date.now();
const USER = {
  email: `readme.shot.${stamp}@dinkboard.test`,
  username: `readmesh${String(stamp).slice(-8)}`,
  password: "ReadmeShotPass123!",
};

mkdirSync(OUT, { recursive: true });

function appUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${normalized}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitSettled(page, ms = 1500) {
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function waitForCharts(page) {
  // Let Recharts SVG / MUI DataGrid / heatmaps paint after data arrives.
  await page
    .waitForFunction(
      () => {
        const root = document.querySelector("#root");
        if (!root || root.innerText.trim().length < 20) return false;
        const hasChart =
          document.querySelectorAll("svg.recharts-surface, .recharts-wrapper").length > 0;
        const hasGrid = document.querySelectorAll(".MuiDataGrid-root").length > 0;
        const hasCards = document.querySelectorAll(".MuiCard-root, .MuiPaper-root").length > 2;
        const stillSkeleton =
          document.querySelectorAll(".MuiSkeleton-root").length > 0;
        if (stillSkeleton) return false;
        return hasChart || hasGrid || hasCards;
      },
      { timeout: 45_000 }
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
}

async function apiAuthWithRetry(request, maxAttempts = 12) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const register = await request.post(`${API}/api/auth/register`, {
      data: USER,
      failOnStatusCode: false,
    });
    if (register.ok()) {
      console.log("Registered screenshot user");
      return;
    }
    if (register.status() === 429) {
      console.log(`Rate-limited (register), waiting 45s… (${attempt}/${maxAttempts})`);
      await sleep(45_000);
      continue;
    }
    const login = await request.post(`${API}/api/auth/login`, {
      data: { email: USER.email, password: USER.password },
      failOnStatusCode: false,
    });
    if (login.ok()) {
      console.log("Logged in screenshot user");
      return;
    }
    if (login.status() === 429) {
      console.log(`Rate-limited (login), waiting 45s… (${attempt}/${maxAttempts})`);
      await sleep(45_000);
      continue;
    }
    throw new Error(
      `Auth failed register=${register.status()} login=${login.status()} ${await login.text()}`
    );
  }
  throw new Error("Auth still rate-limited after retries");
}

async function ensureSidebarOpen(page) {
  const drawer = page.locator(".MuiDrawer-paper").first();
  const open = await drawer.isVisible().catch(() => false);
  if (!open) {
    await page.locator(".MuiToolbar-root .MuiIconButton-root").first().click();
    await page.waitForTimeout(500);
  }
}

async function capture(page, file) {
  const dest = join(OUT, file);
  try {
    unlinkSync(dest);
  } catch {
    // ignore missing
  }
  // Clear any Recharts hover tooltips before shooting.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`✓ ${file} (${statSync(dest).size} bytes)`);
}

async function gotoScene(page, path) {
  await page.goto(appUrl(path), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitSettled(page, 2000);
  await waitForCharts(page);
}

async function loginViaUi(page) {
  await page.goto(appUrl("/login"), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /sign in/i }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByLabel(/email/i).fill(USER.email);
  await page.getByLabel(/^password$/i).fill(USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await waitSettled(page, 2500);
  await page
    .getByRole("button", { name: "Log out" })
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await ensureSidebarOpen(page);
  await waitForCharts(page);
}

async function main() {
  console.log(`Viewport ${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log(`Client ${BASE}  API ${API}`);
  console.log(`Output ${OUT}\n`);

  const browser = await chromium.launch({ headless: true });

  // Register via API only (avoids UI register + rate limits). Login via UI
  // so AuthBootstrap / Redux hydrate the same way a real user would.
  const apiContext = await browser.newContext();
  await apiAuthWithRetry(apiContext.request);
  await apiContext.close();

  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // Prefer dark theme for portfolio shots (matches typical dashboard demos).
  await page.addInitScript(() => {
    localStorage.setItem("dinkboard.mode", "dark");
  });

  // --- Public: login (logged out) ---
  for (const shot of PUBLIC_SHOTS) {
    await gotoScene(page, shot.path);
    await page
      .getByRole("button", { name: /sign in/i })
      .waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(800);
    await capture(page, shot.file);
  }

  // --- Authenticated scenes ---
  await loginViaUi(page);
  await capture(page, "dashboard.png");

  for (const shot of AUTH_SHOTS.filter((s) => s.file !== "dashboard.png")) {
    await gotoScene(page, shot.path);
    await ensureSidebarOpen(page);
    await waitForCharts(page);
    await capture(page, shot.file);
  }

  // Member profile: open the first directory entry (cards/rows are clickable).
  await gotoScene(page, "/members");
  await ensureSidebarOpen(page);
  const firstMember = page.locator("text=/^@/").first();
  await firstMember.waitFor({ state: "visible", timeout: 45_000 });
  await firstMember.click();
  await page.waitForURL(/\/members\/\d+/, { timeout: 30_000 });
  await waitSettled(page, 2500);
  await waitForCharts(page);
  // Heatmap / charts on profile can take an extra beat
  await page.waitForTimeout(1500);
  await capture(page, "member-profile.png");

  await browser.close();
  console.log("\nDone. Screenshots written to docs/screenshots/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
