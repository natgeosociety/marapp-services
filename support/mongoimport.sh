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
if [[ -z "${EXPORT_PREFIX}" ]]; then
    echo "Missing EXPORT_PREFIX environment variable" >&2
    exit 1
fi

# mongoimport | imports content from an Extended JSON, CSV, or TSV export.

mongoimport \
  --uri="${MONGO_URI}/${MONGO_DB}" \
  --collection="layers" \
  --type=json \
  --file="mongo-backup-${EXPORT_PREFIX}.json" \
  --drop \
  --verbose
