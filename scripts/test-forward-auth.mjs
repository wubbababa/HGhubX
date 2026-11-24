import assert from "node:assert/strict";
import http from "node:http";
import { forwardEdgeRequest } from "../server/proxy.mjs";

const token = "fixture-account-token";
let received = null;
const upstream = http.createServer((req, res) => {
  received = req.headers;
  if (req.headers.cookie !== `_USER_TOKEN_=${token}; _LOGIN_=1`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: 0, msg: "missing session cookie" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: 1, data: { id: 17, username: "auth-fixture" } }));
});

try {
  await new Promise(resolve => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  const result = await forwardEdgeRequest({
    origin: `http://127.0.0.1:${address.port}`,
    method: "GET",
    path: "/api/account/me",
    token,
  });
  assert.equal(received.authorization, `Bearer ${token}`);
  assert.equal(received.cookie, `_USER_TOKEN_=${token}; _LOGIN_=1`);
  assert.equal(result.id, 17);
  console.log("PASS: proxy forwards the web token as upstream Authorization and session cookie");
} finally {
  await new Promise(resolve => upstream.close(resolve));
}
