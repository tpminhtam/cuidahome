#!/usr/bin/env bash
# Build the static GitHub Pages preview (UI + bundled sample data).
# API route handlers can't be statically exported, so they're set aside
# during the build; client code falls back to /demo-db.json automatically.
set -euo pipefail
cd "$(dirname "$0")/.."

restore() { [ -d .api-stash ] && rm -rf app/api && mv .api-stash app/api || true; }
trap restore EXIT

# bundle the current sample data (incl. generated report + cached translations)
cp data/db.json public/demo-db.json

rm -rf .api-stash out .next
mv app/api .api-stash

STATIC_EXPORT=1 npx next build

touch out/.nojekyll
echo "Pages build ready in out/"
