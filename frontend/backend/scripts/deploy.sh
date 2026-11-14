#!/usr/bin/env bash
set -euo pipefail

export CLOUDSDK_CONFIG="${CLOUDSDK_CONFIG:-$HOME/.config/gcloud-kipp-nasa}"
task_project="${GCP_PROJECT:-nasa-earth-trends-lab}"
task_region="${GCP_REGION:-us-east4}"
task_account="$(gcloud config get-value account 2>/dev/null)"
if [[ "$task_account" != "lucas.henrique.tai@gmail.com" && "$task_account" != "admin@kipptrend.space" ]]; then
  echo "Use the isolated hackathon gcloud profile (KIPP account)." >&2
  exit 1
fi
task_dir="$(cd "$(dirname "$0")/.." && pwd)"

task_mode="${DEPLOY_MODE:-image}"
if [[ "$task_mode" == "image" ]]; then
  task_image="$task_region-docker.pkg.dev/$task_project/cloud-run-source-deploy/kipp-earth-api:$(date -u +%Y%m%dT%H%M%SZ)"
  gcloud auth configure-docker "$task_region-docker.pkg.dev" --quiet
  docker buildx build --platform linux/amd64 --tag "$task_image" --push "$task_dir"
  task_source=(--image "$task_image")
else
  task_source=(--source "$task_dir")
fi

gcloud run deploy kipp-earth-api \
  --project "$task_project" --region "$task_region" "${task_source[@]}" \
  --service-account "kipp-earth-api@$task_project.iam.gserviceaccount.com" \
  --cpu 1 --memory 512Mi --concurrency 32 --min-instances 0 --max-instances 3 \
  --timeout 60s --cpu-boost --no-invoker-iam-check \
  --set-env-vars "DATA_PROVIDER=databricks-sql,DEPLOY_REGION=$task_region,DATABRICKS_HOST=${DATABRICKS_HOST:-https://8259554586019913.3.gcp.databricks.com},DATABRICKS_WAREHOUSE_ID=${DATABRICKS_WAREHOUSE_ID:-74a8d94611137690}" \
  --set-secrets "DATABRICKS_CREDENTIALS=${DATABRICKS_SECRET:-kipp-earth-api-databricks}:1" \
  --quiet
