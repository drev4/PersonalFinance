#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# setup-dev.sh — Bootstrap the local development environment
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Check required tools
# ---------------------------------------------------------------------------
info "Checking required tools..."

command -v node   >/dev/null 2>&1 || error "Node.js is not installed. Please install Node.js 20+."
command -v pnpm   >/dev/null 2>&1 || error "pnpm is not installed. Run: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Please install Docker Desktop."

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  error "Node.js 20+ is required. Found: v${NODE_VERSION}"
fi

PNPM_VERSION=$(pnpm --version)
PNPM_MAJOR=$(echo "$PNPM_VERSION" | cut -d. -f1)
if [ "$PNPM_MAJOR" -lt 9 ]; then
  error "pnpm 9+ is required. Found: ${PNPM_VERSION}"
fi

success "node v${NODE_VERSION}, pnpm ${PNPM_VERSION}, docker $(docker --version | awk '{print $3}' | tr -d ',')"

# ---------------------------------------------------------------------------
# 2. Copy .env if missing
# ---------------------------------------------------------------------------
ENV_EXAMPLE="packages/api/.env.example"
ENV_FILE="packages/api/.env"

if [ -f "$ENV_EXAMPLE" ] && [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  success "Copied ${ENV_EXAMPLE} -> ${ENV_FILE}"
elif [ -f "$ENV_FILE" ]; then
  warn "${ENV_FILE} already exists — skipping copy."
else
  warn "${ENV_EXAMPLE} not found — skipping .env setup. Create packages/api/.env manually."
fi

# ---------------------------------------------------------------------------
# 3. Start Docker services
# ---------------------------------------------------------------------------
info "Starting Docker services (MongoDB + Redis)..."
docker compose up -d
success "Docker services are running."

# ---------------------------------------------------------------------------
# 4. Install dependencies
# ---------------------------------------------------------------------------
info "Installing pnpm dependencies..."
pnpm install
success "Dependencies installed."

# ---------------------------------------------------------------------------
# 5. Done — print instructions
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}================================================================${RESET}"
echo -e "${GREEN}  Development environment is ready!${RESET}"
echo -e "${GREEN}================================================================${RESET}"
echo ""
echo -e "  Start the app with:"
echo ""
echo -e "    ${CYAN}pnpm dev${RESET}"
echo ""
echo -e "  Services:"
echo -e "    MongoDB  -> mongodb://localhost:27017/finanzas"
echo -e "    Redis    -> redis://localhost:6379"
echo -e "    API      -> http://localhost:3000"
echo -e "    Web      -> http://localhost:5173"
echo ""
echo -e "  Other useful scripts:"
echo -e "    ${CYAN}pnpm build${RESET}      Build all packages for production"
echo -e "    ${CYAN}pnpm test${RESET}       Run the test suite"
echo -e "    ${CYAN}pnpm lint${RESET}       Lint all TypeScript / TSX files"
echo -e "    ${CYAN}pnpm typecheck${RESET}  Run TypeScript type-checking"
echo ""
