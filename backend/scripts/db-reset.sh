#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

bash "$SCRIPT_DIR/db-drop.sh"
bash "$SCRIPT_DIR/db-create.sh"
npm run db:setup
