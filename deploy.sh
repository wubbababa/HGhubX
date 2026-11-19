#!/usr/bin/env bash
# ==============================================================================
# HGhubX Web 端一键部署脚本 (适用于 Ubuntu / Debian / CentOS / Alpine 等 Linux VPS)
# ==============================================================================
set -e

PORT=${PORT:-3000}
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  HGhubX Web 全栈服务一键部署向导"
echo "  目录: $APP_DIR"
echo "  端口: $PORT"
echo "=========================================="

# 1. 检查或安装 Node.js 环境
if ! command -v node >/dev/null 2>&1; then
    echo "[-] 未检测到 Node.js，正在尝试自动安装 (Node.js 20 LTS)..."
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update && apt-get install -y curl
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        yum install -y nodejs
    else
        echo "[!] 请先手动安装 Node.js (>= 18.0.0) 后再运行本脚本！"
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo "[+] Node.js 当前版本: $NODE_VERSION"

# 2. 检查或安装 pnpm
if ! command -v pnpm >/dev/null 2>&1; then
    echo "[-] 正在安装 pnpm..."
    corepack enable >/dev/null 2>&1 || npm install -g pnpm
fi

# 3. 安装依赖并构建前端产物
echo "[-] 正在安装项目依赖..."
cd "$APP_DIR"
pnpm install

echo "[-] 正在构建前端 Web 静态资源 (dist)..."
pnpm web:build

# 4. 后台守护运行服务 (优先使用 PM2，若无则配置 systemd 或 nohup)
echo "[-] 正在配置后台常驻进程..."

if command -v pm2 >/dev/null 2>&1; then
    echo "[+] 检测到 PM2，正在使用 PM2 管理进程..."
    pm2 delete hghubx-web >/dev/null 2>&1 || true
    PORT=$PORT pm2 start server/index.mjs --name "hghubx-web" --node-args="--use-env-proxy"
    pm2 save
    echo "[+] PM2 启动成功！"
elif [ -d "/etc/systemd/system" ] && [ "$(id -u)" -eq 0 ]; then
    echo "[+] 正在创建 systemd 系统服务: /etc/systemd/system/hghubx.service ..."
    cat <<EOF > /etc/systemd/system/hghubx.service
[Unit]
Description=HGhubX Web Fullstack Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$APP_DIR
Environment=PORT=$PORT
Environment=NODE_ENV=production
ExecStart=$(which node) --use-env-proxy server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable hghubx
    systemctl restart hghubx
    echo "[+] Systemd 服务已启动并设置开机自启！"
else
    echo "[!] 既无 PM2 且无 root 权限配置 systemd，使用 nohup 后台启动..."
    pkill -f "server/index.mjs" >/dev/null 2>&1 || true
    nohup node --use-env-proxy server/index.mjs > "$APP_DIR/server.log" 2>&1 &
    echo "[+] 已通过 nohup 启动，日志保存在: $APP_DIR/server.log"
fi

# 5. 防火墙端口提示
if command -v ufw >/dev/null 2>&1; then
    ufw allow "$PORT"/tcp >/dev/null 2>&1 || true
elif command -v firewall-cmd >/dev/null 2>&1; then
    firewall-cmd --zone=public --add-port="$PORT"/tcp --permanent >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
fi

echo "=========================================="
echo "  🎉 HGhubX Web 部署成功！"
echo "  外网访问地址: http://<你的VPS_IP>:$PORT"
echo "  如需查看状态/日志:"
if command -v pm2 >/dev/null 2>&1; then
    echo "    pm2 status"
    echo "    pm2 logs hghubx-web"
elif [ -f "/etc/systemd/system/hghubx.service" ]; then
    echo "    systemctl status hghubx"
    echo "    journalctl -u hghubx -f"
else
    echo "    tail -f $APP_DIR/server.log"
fi
echo "=========================================="
