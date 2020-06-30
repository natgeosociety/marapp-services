#!/bin/bash
set -x
aws --endpoint-url=http://localhost:4572 s3 mb s3://marapp-assets
set +x
