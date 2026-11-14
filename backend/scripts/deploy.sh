#!/usr/bin/env bash
set -euo pipefail

task_project="${GCP_PROJECT:-nasa-earth-trends-lab}"
task_region="${GCP_REGION:-us-east4}"
task_account="${GCP_ACCOUNT:-admin@kipptrend.space}"
if [[ "$task_account" != "lucas.henrique.tai@gmail.com" && "$task_account" != "admin@kipptrend.space" ]]; then
  echo "Use a KIPP hackathon GCP account." >&2
  exit 1
fi
task_dir="$(cd "$(dirname "$0")/.." && pwd)"
export CLOUDSDK_CORE_ACCOUNT="$task_account"

task_image="$task_region-docker.pkg.dev/$task_project/cloud-run-source-deploy/kipp-earth-api:$(date -u +%Y%m%dT%H%M%SZ)"
gcloud auth configure-docker "$task_region-docker.pkg.dev" --quiet
docker buildx build --platform linux/amd64 --tag "$task_image" --push "$task_dir"
task_digest="$(gcloud artifacts docker images describe "$task_image" --project "$task_project" --format='value(image_summary.digest)')"
[[ -n "$task_digest" ]]

exec bash "$task_dir/scripts/deploy-image.sh" "${task_image%:*}@$task_digest"
