#!/usr/bin/env bash
#
# alvy 安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/derekhut/alvy/main/install.sh | bash
#
set -euo pipefail

ALVY_LOG_DIR="$HOME/.alvy"
ALVY_LOG="$ALVY_LOG_DIR/install.log"
REQUIRED_NODE_MAJOR=18
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh"
NETWORK_TIMEOUT=10

# --- 日志 ---

mkdir -p "$ALVY_LOG_DIR"
exec > >(tee -a "$ALVY_LOG") 2>&1
echo ""
echo "=== alvy 安装日志 $(date) ==="
echo ""

# --- 工具函数 ---

info()  { echo "  ✓ $1"; }
warn()  { echo "  ! $1"; }
fail()  { echo "  ✗ $1"; echo ""; echo "安装失败。日志文件: $ALVY_LOG"; exit 1; }

fetch_url() {
  local url="$1"
  local dest="$2"
  if command -v curl &>/dev/null; then
    curl -fsSL --connect-timeout "$NETWORK_TIMEOUT" -o "$dest" "$url"
  elif command -v wget &>/dev/null; then
    wget -q --timeout="$NETWORK_TIMEOUT" -O "$dest" "$url"
  else
    fail "未找到 curl 或 wget，请先安装其中之一"
  fi
}

# 检查下载内容是否被代理拦截（学校防火墙可能返回 HTML）
verify_not_html() {
  local file="$1"
  local context="$2"
  if head -c 20 "$file" 2>/dev/null | grep -qi "<!doctype\|<html"; then
    fail "$context — 下载的内容是 HTML 而非脚本，可能被学校防火墙拦截了。请检查网络连接或使用手机热点重试"
  fi
}

# --- 安全检查 ---

if [ "$(id -u)" -eq 0 ]; then
  fail "请不要使用 sudo 运行此脚本。以普通用户运行即可"
fi

echo "正在安装 alvy..."
echo ""

# --- 检测 Node.js ---

install_node_via_nvm() {
  echo "  正在安装 nvm..."
  local nvm_script
  nvm_script=$(mktemp)
  fetch_url "$NVM_INSTALL_URL" "$nvm_script"
  verify_not_html "$nvm_script" "nvm 安装脚本下载"
  bash "$nvm_script" 2>&1
  rm -f "$nvm_script"

  # Source nvm for this session
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  if ! command -v nvm &>/dev/null; then
    fail "nvm 安装完成但无法加载，请打开新终端后重新运行此脚本"
  fi

  echo "  正在安装 Node.js 22 LTS..."
  nvm install 22 2>&1
  nvm use 22 2>&1

  if ! command -v node &>/dev/null; then
    fail "Node.js 安装失败"
  fi
  info "Node.js $(node --version) 已通过 nvm 安装"
}

HAS_NODE=false
if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]; then
    info "检测到 Node.js $NODE_VERSION"
    HAS_NODE=true
  else
    warn "Node.js $NODE_VERSION 版本太低（需要 >= 18）"
    install_node_via_nvm
    HAS_NODE=true
  fi
else
  warn "未检测到 Node.js"
  install_node_via_nvm
  HAS_NODE=true
fi

# --- 确保 npm install -g 无需 sudo ---

# If npm's global prefix requires sudo (common with nodejs.org installer),
# configure a user-local prefix
if ! $HAS_NODE; then
  fail "Node.js 不可用"
fi

NPM_PREFIX=$(npm config get prefix 2>/dev/null || echo "")
if [ -n "$NPM_PREFIX" ] && [ ! -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
  echo "  npm 全局安装需要 sudo，正在配置用户目录..."
  mkdir -p "$HOME/.npm-global"
  npm config set prefix "$HOME/.npm-global" 2>&1

  # Add to PATH for this session
  export PATH="$HOME/.npm-global/bin:$PATH"

  # Add to shell profile for future sessions
  SHELL_PROFILE=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_PROFILE="$HOME/.bashrc"
  elif [ -f "$HOME/.bash_profile" ]; then
    SHELL_PROFILE="$HOME/.bash_profile"
  fi

  if [ -n "$SHELL_PROFILE" ]; then
    if ! grep -q 'npm-global' "$SHELL_PROFILE" 2>/dev/null; then
      echo '' >> "$SHELL_PROFILE"
      echo '# npm global packages (added by alvy installer)' >> "$SHELL_PROFILE"
      echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$SHELL_PROFILE"
      info "已将 ~/.npm-global/bin 添加到 $SHELL_PROFILE"
    fi
  else
    warn "未找到 shell 配置文件，请手动添加 export PATH=\"\$HOME/.npm-global/bin:\$PATH\" 到你的 shell 配置"
  fi
fi

# --- 安装 alvy ---

echo "  正在安装 alvy..."
npm install -g alvy 2>&1

if ! command -v alvy &>/dev/null; then
  # Check if it's in npm-global but not in PATH yet
  if [ -x "$HOME/.npm-global/bin/alvy" ]; then
    export PATH="$HOME/.npm-global/bin:$PATH"
  fi
fi

if ! command -v alvy &>/dev/null; then
  fail "alvy 安装完成但无法找到命令，请打开新终端后运行 alvy"
fi

info "alvy 已安装"

# --- 验证 ---

echo ""
echo "正在验证安装..."
alvy doctor
echo ""
echo "安装完成！运行 alvy 开始学习。"
echo ""
echo "日志文件: $ALVY_LOG"
