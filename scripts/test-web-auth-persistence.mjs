import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const user = { id: 17, username: "auth-fixture", nickname: "刷新测试用户", counts: {} };
const token = "persisted-test-token";
const installedBrowsers = process.platform === "win32" ? [
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
] : [];
const executablePath = process.env.BROWSER_EXECUTABLE || installedBrowsers.find(existsSync);
let vite;
let browser;

try {
  vite = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
  await vite.listen();
  const origin = vite.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  let rejectCanonicalProbe = false;
  await page.route("**/api/invoke/*", async route => {
    const cmd = new URL(route.request().url()).pathname.split("/").pop();
    const auth = route.request().headers().authorization || "";
    const emptyPage = { items: [], pagination: { page: 1, pages: 1, size: 20, total: 0 } };
    if (cmd === "api_login") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user, origin: "https://fixture.invalid", token, interactions: {} }) });
    }
    if (cmd === "app_boot") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        user: auth === `Bearer ${token}` ? user : null,
        logged_in: auth === `Bearer ${token}`,
        base: "https://fixture.invalid", strict_security: false, cli_relaxed: true,
      }) });
    }
    if (cmd === "api_me") {
      if (rejectCanonicalProbe) {
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "HTTP 401: session expired" }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user, origin: "https://fixture.invalid", interactions: { favorite_video_ids: [] } }) });
    }
    if (cmd === "api_account_history") {
      // A failing auxiliary account endpoint must not erase a valid session.
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "HTTP 401: upstream rejected history only" }) });
    }
    if (cmd === "line_auto") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ base: "https://fixture.invalid", previous: "https://fixture.invalid", switched: false, pick: { tier: "main", ms: 1, reason: "fixture", candidates: [] } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyPage) });
  });

  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "账号与个人中心" }).click();
  await page.getByRole("textbox", { name: "账号" }).fill(user.username);
  await page.getByRole("textbox", { name: "密码" }).fill("test-password");
  await page.getByRole("button", { name: "登录", exact: true }).last().click();
  await page.getByText(user.nickname, { exact: true }).first().waitFor({ timeout: 10000 });

  const afterLogin = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  assert.equal(afterLogin.hghubx_web_token, token);
  assert.equal(JSON.parse(afterLogin.hghubx_web_user).id, user.id);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(user.nickname, { exact: true }).first().waitFor({ timeout: 10000 });
  const afterReload = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  assert.equal(afterReload.hghubx_web_token, token, "token must survive refresh");
  assert.equal(JSON.parse(afterReload.hghubx_web_user).id, user.id, "cached account must survive refresh");
  assert.deepEqual(pageErrors, []);

  // The canonical account probe remains authoritative: a real expired session must still clear.
  rejectCanonicalProbe = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !localStorage.getItem("hghubx_web_token"), null, { timeout: 10000 });
  assert.equal(await page.evaluate(() => localStorage.getItem("hghubx_web_user")), null);
  console.log("PASS: web account survives login and refresh when an auxiliary account endpoint fails auth");
} finally {
  await browser?.close();
  await vite?.close();
}
