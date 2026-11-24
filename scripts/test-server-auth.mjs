import assert from "node:assert/strict";
import http from "node:http";
import { executeCommand } from "../server/index.mjs";

const testUser = { id: 88, username: "test_persist_user", nickname: "持久化用户", counts: {} };
const testToken = "test_persist_token_12345";

// 创建一个模拟上游服务：login 成功返回，但 me 返回 401（模拟生产环境中上游 /api/account/me 拒绝无 Cookie 调用的情况）
const upstream = http.createServer((req, res) => {
  if (req.url === "/api/account/loginByPassword") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": ["_USER_TOKEN_=" + testToken + "; Path=/; HttpOnly", "_LOGIN_=1; Path=/"],
    });
    res.end(JSON.stringify({
      status: 1,
      data: {
        token: testToken,
        user: testUser,
      }
    }));
    return;
  }

  if (req.url.startsWith("/api/account/me")) {
    // 模拟上游直接访问时返回 401
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: 0, msg: "unauthorized" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: 0, msg: "not found" }));
});

try {
  await new Promise(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  const origin = `http://127.0.0.1:${address.port}`;

  // 1. 设置线路为该 upstream
  await executeCommand("line_set", { url: origin });

  // 2. 执行登录
  const loginResult = await executeCommand("api_login", {
    username: testUser.username,
    password: "test_password"
  });
  assert.equal(loginResult.token, testToken);
  assert.equal(loginResult.user.id, testUser.id);
  console.log("PASS: 1. api_login 成功获取 token 与 user");

  // 3. 执行 api_me：即使上游 /api/account/me 返回 401，服务端也必须凭借本地活跃会话返回用户信息，绝不能崩溃抛出 401！
  const meResult = await executeCommand("api_me", {}, `Bearer ${testToken}`);
  assert.equal(meResult.user.id, testUser.id);
  assert.equal(meResult.user.username, testUser.username);
  console.log("PASS: 2. api_me 在上游 401 时成功通过会话缓存托底返回用户资料，防止登录态闪退");

  // 4. 执行 app_boot：必须正确恢复会话
  const bootResult = await executeCommand("app_boot", {}, `Bearer ${testToken}`);
  assert.equal(bootResult.logged_in, true);
  assert.equal(bootResult.user.id, testUser.id);
  console.log("PASS: 3. app_boot 成功识别登录态");

  // 5. 执行退出登录
  await executeCommand("api_logout", {}, `Bearer ${testToken}`);
  console.log("PASS: 4. api_logout 成功清理会话");

  // 6. 再次执行 api_me：此时会话已被清除，上游返回 401，应当正确抛出异常
  let errorCaught = false;
  try {
    await executeCommand("api_me", {}, `Bearer ${testToken}`);
  } catch (err) {
    errorCaught = true;
    assert.match(err.message, /401/);
  }
  assert.equal(errorCaught, true, "登出后 api_me 应当正常抛出 401 错误");
  console.log("PASS: 5. 登出后 api_me 正确拒绝并抛出 401");

  console.log("ALL TESTS PASSED: Web 端登录会话生命周期与 api_me 兜底机制验证成功！");
} finally {
  await new Promise(resolve => upstream.close(resolve));
}
