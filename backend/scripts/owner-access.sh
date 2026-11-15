#!/usr/bin/env bash
set -euo pipefail
# Run as owner/admin of the hackathon project, not with work credentials.
# Runtime uses Google ID tokens for Databricks; no client secret is mounted.
task_project="${GCP_PROJECT:-kipp-space-apps-2026}"
task_account="${GCP_ACCOUNT:-kipp.nasa@gmail.com}"
export CLOUDSDK_CONFIG="${CLOUDSDK_CONFIG:-$HOME/.config/gcloud-kipp-nasa}"
gcloud run services update kipp-earth-api \
  --project="$task_project" --account="$task_account" --region=us-east4 \
  --invoker-iam-check --quiet
