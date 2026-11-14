#!/usr/bin/env bash
set -euo pipefail

task_project="${GCP_PROJECT:-nasa-earth-trends-lab}"
task_region="${GCP_REGION:-us-east4}"
task_image="${1:?Usage: deploy-image.sh IMAGE}"
task_service=kipp-earth-api
task_repository="$task_region-docker.pkg.dev/$task_project/cloud-run-source-deploy/kipp-earth-api"
if [[ "$task_image" != "$task_repository:"* && "$task_image" != "$task_repository@sha256:"* ]]; then
  echo 'Image must belong to the backend Artifact Registry repository.' >&2
  exit 1
fi

# New revision is reachable at a tagged URL; production stays on its current revision.
gcloud run deploy "$task_service" \
  --project "$task_project" --region "$task_region" --image "$task_image" \
  --service-account "kipp-earth-api@$task_project.iam.gserviceaccount.com" \
  --cpu 1 --memory 512Mi --concurrency 32 --min-instances 0 --max-instances 3 \
  --timeout 60s --cpu-boost --no-invoker-iam-check --no-traffic --tag candidate \
  --update-env-vars "DATA_PROVIDER=databricks-sql,DATABRICKS_AUTH_TYPE=google-id,DEPLOY_REGION=$task_region,DATABRICKS_HOST=https://8259554586019913.3.gcp.databricks.com,DATABRICKS_WAREHOUSE_ID=74a8d94611137690" \
  --remove-secrets DATABRICKS_CREDENTIALS --quiet

mapfile -t task_deployment < <(gcloud run services describe "$task_service" --project "$task_project" --region "$task_region" --format=json | node --input-type=module -e '
  import assert from "node:assert/strict";
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  const { status } = JSON.parse(body);
  const candidate = status.traffic.find(t => t.tag === "candidate");
  assert.ok(candidate?.url && candidate.revisionName);
  assert.equal(candidate.revisionName, status.latestReadyRevisionName);
  assert.equal(candidate.revisionName, status.latestCreatedRevisionName);
  console.log(candidate.revisionName);
  console.log(candidate.url);
')
task_revision="${task_deployment[0]:-}"
task_url="${task_deployment[1]:-}"
[[ -n "$task_revision" && -n "$task_url" ]]
bash "$(dirname "$0")/smoke.sh" "$task_url"

# Promote exactly the revision tested, not whichever revision happens to be latest.
gcloud run services update-traffic "$task_service" --project "$task_project" \
  --region "$task_region" --to-revisions "$task_revision=100" --quiet
task_production="$(gcloud run services describe "$task_service" --project "$task_project" --region "$task_region" --format='value(status.url)')"
bash "$(dirname "$0")/smoke.sh" "$task_production"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf 'Deployed `%s`\n\nImage: `%s`\n\nURL: %s\n' "$task_revision" "$task_image" "$task_production" >> "$GITHUB_STEP_SUMMARY"
fi
