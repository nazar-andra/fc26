#!/bin/sh
set -e

# Seed the data directory on first run (when the volume is empty).
if [ -d /app/data-seed ]; then
  for file in /app/data-seed/*.json; do
    [ -e "$file" ] || continue
    name="$(basename "$file")"
    if [ ! -f "/app/data/$name" ]; then
      cp "$file" "/app/data/$name"
      echo "Seeded $name"
    fi
  done
fi

# Ensure the app user owns the data directory (volume may be mounted from host).
chown -R app:app /app/data

# Drop privileges and run the app as the non-root user.
exec su -s /bin/sh app -c "exec node server.js"
