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

# mongorestore | creates a new database or adds data to an existing database.

mongorestore \
  --uri="${MONGO_URI}/${MONGO_DB}" \
  --nsInclude="marapp-prod.*" \
  --nsFrom="marapp-prod.*" \
  --nsTo="marapp-dev.*" \
  --gzip \
  --archive="mongo-backup-${EXPORT_PREFIX}.tar.gz" \
  --verbose
