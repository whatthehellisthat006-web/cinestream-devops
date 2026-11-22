#!/usr/bin/env bash
# ==============================================================================
# CineStream - DevOps Validation & Control Script (Atelier 2)
# Returns exit code 0 if all checks pass, non-zero (1) if any check fails.
# ==============================================================================

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Support local portable tools on Windows if not on global PATH
if ! command -v mvn >/dev/null 2>&1 && [ -x "$HOME/tools/apache-maven-3.9.9/bin/mvn" ]; then
  export PATH="$HOME/tools/apache-maven-3.9.9/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1 && [ -x "$HOME/tools/node24/node.exe" ]; then
  export PATH="$HOME/tools/node24:$PATH"
fi

ERRORS=0

pass() {
  echo "[PASS] $1"
}

fail() {
  echo "[FAIL] $1"
  ERRORS=$((ERRORS + 1))
}

echo "=================================================="
echo " CineStream DevOps Validation Script"
echo "=================================================="

# 1. Check required project files
echo ""
echo "--- 1. Checking required project structure ---"
REQUIRED_FILES=(
  "backend/pom.xml"
  "backend/src/main/resources/application.properties"
  "frontend/package.json"
  "frontend/angular.json"
  "database/schema.sql"
  "database/data.sql"
  ".gitignore"
  ".env.example"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "Found $file"
  else
    fail "Missing required file: $file"
  fi
done

# 2. Check Git & secrets hygiene
echo ""
echo "--- 2. Checking Git & secrets hygiene ---"
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env file is tracked by Git! Remove it immediately."
else
  pass "No .env file tracked by Git"
fi

if grep -q "^\.env$" .gitignore; then
  pass ".gitignore excludes .env"
else
  fail ".gitignore does not exclude .env"
fi

if grep -REn "(eeaf208ccf98e59a4a65615caae7486c|8d52764bc2593be6338cb26f4212f6fc|cinestream_super_secret_jwt_key)" backend/src >/dev/null 2>&1; then
  fail "Hardcoded secret detected in backend/src!"
else
  pass "No known hardcoded secrets found in backend/src"
fi

# 3. Validate frontend package.json syntax
echo ""
echo "--- 3. Validating frontend manifest ---"
if command -v node >/dev/null 2>&1; then
  if node -e "JSON.parse(require('fs').readFileSync('frontend/package.json','utf8'))" >/dev/null 2>&1; then
    pass "frontend/package.json is valid JSON"
  else
    fail "frontend/package.json is invalid JSON"
  fi
else
  fail "Node.js is not available to validate frontend/package.json"
fi

# 4. Validate backend compilation & tests via Maven
echo ""
echo "--- 4. Validating backend build & tests (Maven) ---"
if command -v mvn >/dev/null 2>&1; then
  if mvn -f backend/pom.xml test -q; then
    pass "Backend Maven build & tests succeeded"
  else
    fail "Backend Maven build or tests failed"
  fi
else
  fail "Maven (mvn) is not installed or not in PATH"
fi

# Final summary & exit code
echo ""
echo "=================================================="
if [ "$ERRORS" -eq 0 ]; then
  echo " RESULT: ALL CHECKS PASSED (exit code 0)"
  echo "=================================================="
  exit 0
else
  echo " RESULT: FAILED with $ERRORS error(s) (exit code 1)"
  echo "=================================================="
  exit 1
fi
