#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
PACKS="$ROOT/packs"
OUT="$ROOT/custom_activities.json"

if [ ! -d "$PACKS" ]; then
  echo "ERROR: $PACKS not found. Run from public_html or pass the root path." >&2
  exit 1
fi

# --- 0) Backup ---
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="packs-backup-$STAMP.tgz"
tar -czf "$BACKUP" packs
echo "✅ Backup created: $BACKUP"

# --- 1) Move yearX/spelling|grammar → yearX/english/spelling|grammar ---
echo "▶️  Restructuring folders to /packs/<year>/<subject>/<topic>/<slug>.json ..."
shopt -s nullglob
for ydir in "$PACKS"/year*; do
  [ -d "$ydir" ] || continue
  for topic in spelling grammar; do
    src="$ydir/$topic"
    if [ -d "$src" ]; then
      dst="$ydir/english/$topic"
      mkdir -p "$dst"
      # merge/move contents
      rsync -a "$src"/ "$dst"/ || true
      rm -rf "$src"
      echo "  moved: ${src#"$PACKS/"} → ${dst#"$PACKS/"}"
    fi
  done
done
shopt -u nullglob

# --- 2) Update each JSON's `"id"` to match its relative path under packs ---
echo "▶️  Updating JSON ids to match new paths ..."
edited=0
while IFS= read -r -d '' f; do
  rel="${f#$PACKS/}"              # e.g. year4/english/spelling/super-suffixes.json
  id="${rel%.json}"               # drop .json
  if command -v jq >/dev/null 2>&1; then
    tmp="$(mktemp)"
    jq --arg new "$id" '.id = $new' "$f" > "$tmp" && mv "$tmp" "$f" && edited=$((edited+1))
  else
    # sed fallback (keeps formatting simple)
    sed -E -i.bak "s/\"id\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"id\": \"$id\"/" "$f" && rm -f "$f.bak" && edited=$((edited+1))
  fi
done < <(find "$PACKS" -type f -name '*.json' -print0)
echo "  ids updated in $edited files."

# --- 3) Rebuild custom_activities.json from standardized folders ---
echo "▶️  Building custom_activities.json ..."
TMP="$(mktemp)"
echo "[" > "$TMP"
first=1
while IFS= read -r -d '' f; do
  rel="${f#$PACKS/}"                 # yearX/subject/topic/slug.json
  id="${rel%.json}"
  IFS='/' read -r year subject topic slug <<<"$id"

  # Title from JSON if jq exists; else prettify slug
  if command -v jq >/dev/null 2>&1; then
    title="$(jq -r '.title // empty' "$f")"
  else
    title=""
  fi
  [ -z "$title" ] && title="$(echo "$slug" | tr '-' ' ' | sed 's/\b./\u&/g')"

  # Icon guesses
  icon="📘"
  [ "$subject" = "maths" ] && icon="🔢"
  if [ "$subject" = "english" ]; then
    [ "$topic" = "spelling" ] && icon="✍️"
    [ "$topic" = "grammar" ]  && icon="📚"
  fi

  [ $first -eq 0 ] && echo "," >> "$TMP" || first=0
  printf '{"id":"%s","title":"%s","icon":"%s","subject":"%s","year":"%s","topic":"%s"}' \
    "$id" "$title" "$icon" "$subject" "${year#year}" "$topic" >> "$TMP"
done < <(find "$PACKS" -type f -name '*.json' -print0 | sort -z)
echo "]" >> "$TMP"
mv "$TMP" "$OUT"
echo "  wrote: $OUT"

echo "✅ Done. Folders standardized and activities rebuilt."
