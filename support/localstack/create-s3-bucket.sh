#!/bin/bash
set -x
aws --endpoint-url=http://localhost:4566 s3 mb s3://marapp-assets
set +x
