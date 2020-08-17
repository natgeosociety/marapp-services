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

# mongodump | creates a binary export of the contents of a database.

mongodump \
  --uri="${MONGO_URI}/${MONGO_DB}" \
  --gzip \
  --archive="mongo-backup-${EXPORT_PREFIX}.tar.gz" \
  --verbose
