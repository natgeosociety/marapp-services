#!/usr/bin/env bash

set -e

if [[ -z "${MONGO_URI}" ]]; then
    echo "Missing MONGO_URI environment variable" >&2
    exit 1
fi
if [[ -z "${MONGO_DB}" ]]; then
    echo "Missing MONGO_DB environment variable" >&2
    exit 1
fi

EXPORT_PREFIX=$(date +%Y-%m-%dT%H:%M:%S)

# mongoexport | produces a JSON or CSV export of data stored in a MongoDB instance.

mongoexport \
  --uri="${MONGO_URI}/${MONGO_DB}" \
  --collection="layers" \
  --type=json \
  --out="mongo-backup-${EXPORT_PREFIX}.json" \
  --verbose
