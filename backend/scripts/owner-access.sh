#!/usr/bin/env bash
set -euo pipefail
# Run as owner/admin of the hackathon project, not with work credentials.
gcloud secrets add-iam-policy-binding kipp-earth-api-databricks \
  --project=nasa-earth-trends-lab \
  --member=serviceAccount:kipp-earth-api@nasa-earth-trends-lab.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor --quiet
gcloud run services update kipp-earth-api \
  --project=nasa-earth-trends-lab --region=us-east4 \
  --no-invoker-iam-check --quiet
