/**
 * Dinkboard M8 visual QA screenshot matrix.
 * Usage: node e2e/visual-qa.mjs [passName] [scene1,scene2,...]
 *
 * Auth: one API register/login → cookies into the browser context.
 * Theme: localStorage + Redux setModeExplicit (no repeated login/logout).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PASS = process.argv[2] || "pass1";
const SCENE_FILTER = process.argv[3]
  ? new Set(process.argv[3].split(",").map((s) => s.trim()).filter(Boolean))
  : null;
const OUT = join(ROOT, "client/smoke-evidence", PASS);
const BASE = process.env.DINK_BASE || "http://localhost:3000";
const API = process.env.DINK_API || "http://localhost:5001";
const WIDTHS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const THEMES = ["dark", "light"];
const PUBLIC_SCENES = ["login", "register"];
const AUTH_SCENES = [
  "dashboard",
  "messages",
  "members",
  "emojis",
  "firsts",
  "juice",
  "ai",
  "economy",
];

const publicScenes = SCENE_FILTER
  ? PUBLIC_SCENES.filter((s) => SCENE_FILTER.has(s))
  : PUBLIC_SCENES;
const authScenes = SCENE_FILTER
  ? AUTH_SCENES.filter((s) => SCENE_FILTER.has(s))
  : AUTH_SCENES;
const stamp = Date.now();
const QA_USER = {
  email: `qa.visual.${stamp}@dinkboard.test`,
  username: `qavisual${String(stamp).slice(-8)}`,
  password: "VisualQaPass123!",
};

mkdirSync(OUT, { recursive: true });

function appUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${normalized}`;
}

async function waitSettled(page, ms = 1200) {
  await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function waitForPaint(page) {
  await page
    .waitForFunction(
      () => (document.querySelector("#root")?.innerText || "").trim().length > 8,
      { timeout: 45000 }
    )
    .catch(() => {});
  await page.waitForTimeout(600);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiAuthWithRetry(request, maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const register = await request.post(`${API}/api/auth/register`, {
      data: QA_USER,
      failOnStatusCode: false,
    });
    if (register.ok()) {
      console.log("Registered QA user via API");
      return;
    }
    const status = register.status();
    if (status === 429) {
      console.log(`Auth rate-limited (register), waiting 45s… (${attempt}/${maxAttempts})`);
      await sleep(45000);
      continue;
    }
    // maybe exists — try login
    const login = await request.post(`${API}/api/auth/login`, {
      data: { email: QA_USER.email, password: QA_USER.password },
      failOnStatusCode: false,
    });
    if (login.ok()) {
      console.log("Logged in QA user via API");
      return;
    }
    if (login.status() === 429) {
      console.log(`Auth rate-limited (login), waiting 45s… (${attempt}/${maxAttempts})`);
      await sleep(45000);
      continue;
    }
    throw new Error(
      `Auth failed register=${status} login=${login.status()} body=${await login.text()}`
    );
  }
  throw new Error("Auth still rate-limited after retries");
}

async function transferCookies(apiContext, browserContext) {
  const cookies = await apiContext.cookies(API);
  if (!cookies.length) throw new Error("No auth cookies from API context");
  await browserContext.addCookies(
    cookies.map((c) => ({
      ...c,
      domain: "localhost",
      path: c.path || "/",
    }))
  );
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("dinkboard.mode", t);
    const store = window.__DINK_STORE__;
    if (store) store.dispatch({ type: "global/setModeExplicit", payload: t });
  }, theme);
  await page.waitForTimeout(350);
}

async function softLogout(page) {
  await page.evaluate(() => {
    const store = window.__DINK_STORE__;
    if (store) store.dispatch({ type: "auth/loggedOut" });
  });
  // Keep cookies? PublicOnly uses Redux user. Clear cookies so /me stays logged out.
  await page.context().clearCookies();
  await page.waitForTimeout(200);
}

async function softLogin(page, browserContext, apiContext) {
  // Restore cookies from API session (refresh jar by hitting me)
  const cookies = await apiContext.cookies(API);
  if (!cookies.length) {
    // re-login via API if cookies expired
    const login = await apiContext.request.post(`${API}/api/auth/login`, {
      data: { email: QA_USER.email, password: QA_USER.password },
      failOnStatusCode: false,
    });
    if (!login.ok()) throw new Error(`softLogin API login failed ${login.status()}`);
  }
  const fresh = await apiContext.cookies(API);
  await browserContext.clearCookies();
  await browserContext.addCookies(
    fresh.map((c) => ({
      ...c,
      domain: "localhost",
      path: c.path || "/",
    }))
  );
  await page.goto(appUrl("/dashboard"), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await waitSettled(page, 1500);
  // hydrate user if needed
  await page.evaluate(async () => {
    const store = window.__DINK_STORE__;
    if (!store) return;
    try {
      const res = await fetch("http://localhost:5001/api/auth/me", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const user = data.user || data;
        store.dispatch({ type: "auth/setCredentials", payload: user });
      }
    } catch {
      // ignore
    }
  });
  await waitSettled(page, 800);
}

async function ensureSidebarOpen(page, isDesktop) {
  if (!isDesktop) {
    await page.keyboard.press("Escape").catch(() => {});
    return;
  }
  const drawer = page.locator(".MuiDrawer-paper").first();
  const open = await drawer.isVisible().catch(() => false);
  if (!open) {
    await page.locator(".MuiToolbar-root .MuiIconButton-root").first().click();
    await page.waitForTimeout(500);
  }
}

async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function collectConsole(page, bucket) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      bucket.push({ type: "console", text: msg.text(), url: page.url() });
    }
  });
  page.on("pageerror", (err) => {
    bucket.push({ type: "pageerror", text: String(err), url: page.url() });
  });
  page.on("response", (res) => {
    const u = res.url();
    if (!u.includes("/api/") || res.status() < 400) return;
    if (
      res.status() === 401 &&
      (u.includes("/api/auth/me") || u.includes("/api/auth/refresh"))
    ) {
      return;
    }
    bucket.push({ type: "http", text: `${res.status()} ${u}`, url: page.url() });
  });
}

async function main() {
  const errors = [];
  const matrix = [];
  const browser = await chromium.launch({ headless: true });

  const apiContext = await browser.newContext();
  await apiAuthWithRetry(apiContext.request);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await transferCookies(apiContext, context);
  const page = await context.newPage();
  collectConsole(page, errors);

  console.log("QA user:", QA_USER.email);

  // Prime app + store
  await page.goto(appUrl("/dashboard"), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await waitSettled(page, 2000);
  await page.waitForFunction(() => Boolean(window.__DINK_STORE__), {
    timeout: 30000,
  });

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w.width, height: w.height });
    const isDesktop = w.name === "desktop";

    for (const theme of THEMES) {
      // Public scenes: logged-out + theme via localStorage/reload
      await softLogout(page);
      await page.addInitScript((t) => {
        localStorage.setItem("dinkboard.mode", t);
      }, theme);
      // Force remount with stored theme
      await page.goto(appUrl("/login"), {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await setTheme(page, theme);
      // reload so ThemeProvider picks initial state if needed
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await waitSettled(page, 1000);
      await setTheme(page, theme);

      for (const scene of publicScenes) {
        await page.goto(appUrl(`/${scene}`), {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await waitSettled(page, 900);
        await waitForPaint(page);
        const file = `${scene}-${w.name}-${theme}`;
        const path = await shot(page, file);
        matrix.push({ scene, width: w.name, theme, path, authenticated: false });
        console.log("shot", file, statSync(path).size);
      }

      // Auth scenes — skip softLogin when capturing public-only
      if (authScenes.length === 0) continue;

      await softLogin(page, context, apiContext);
      await setTheme(page, theme);

      for (const scene of authScenes) {
        await page.goto(appUrl(`/${scene}`), {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await waitSettled(page, 2000);
        await ensureSidebarOpen(page, isDesktop);
        await setTheme(page, theme);
        await waitForPaint(page);

        const textLen = await page.evaluate(
          () => (document.querySelector("#root")?.innerText || "").trim().length
        );
        if (textLen < 8) {
          console.log("blank recovery", scene, w.name, theme);
          await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
          await waitSettled(page, 2500);
          await softLogin(page, context, apiContext);
          await setTheme(page, theme);
          await page.goto(appUrl(`/${scene}`), {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          await waitSettled(page, 2500);
          await ensureSidebarOpen(page, isDesktop);
        }

        const file = `${scene}-${w.name}-${theme}`;
        const path = await shot(page, file);
        matrix.push({ scene, width: w.name, theme, path, authenticated: true });
        console.log("shot", file, statSync(path).size);
      }
    }
  }

  const report = {
    pass: PASS,
    out: OUT,
    user: { email: QA_USER.email, username: QA_USER.username },
    matrix,
    errors,
    capturedAt: new Date().toISOString(),
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("\nDone. Shots:", matrix.length, "Errors:", errors.length);
  console.log("Evidence:", OUT);

  await apiContext.close();
  await browser.close();
  if (errors.some((e) => e.type === "pageerror")) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
