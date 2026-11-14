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

task_provider="${DATA_PROVIDER:-lakebase-postgres}"
case "$task_provider" in
  lakebase-postgres)
    task_data_env="DATA_PROVIDER=lakebase-postgres,DATABRICKS_AUTH_TYPE=google-id,DEPLOY_REGION=$task_region,DATABRICKS_HOST=https://8259552519150212.2.gcp.databricks.com,PGHOST=ep-gentle-glade-g3123wa8.database.us-east4.gcp.databricks.com,PGDATABASE=databricks_postgres,PGUSER=kipp-earth-api@$task_project.iam.gserviceaccount.com,DATA_SCHEMA=default,LAKEBASE_ENDPOINT=projects/rt-demo/branches/production/endpoints/primary"
    ;;
  databricks-sql)
    task_data_env="DATA_PROVIDER=databricks-sql,DATABRICKS_AUTH_TYPE=google-id,DEPLOY_REGION=$task_region,DATABRICKS_HOST=https://8259554586019913.3.gcp.databricks.com,DATABRICKS_WAREHOUSE_ID=74a8d94611137690,DATA_SCHEMA=refined"
    ;;
  *) echo 'Unsupported DATA_PROVIDER' >&2; exit 1 ;;
esac
export EXPECTED_DATA_PROVIDER="$task_provider"

# Deployment identities must not invoke the API or change its access policy.
# Fail closed if the one-time private-access setup has not completed.
task_previous="$(gcloud run services describe "$task_service" --project "$task_project" --region "$task_region" --format=json | node --input-type=module -e '
  import assert from "node:assert/strict";
  let body = "";
  for await (const chunk of process.stdin) body += chunk;
  const { metadata, status } = JSON.parse(body);
  assert.notEqual(metadata.annotations?.["run.googleapis.com/invoker-iam-disabled"], "true", "Cloud Run must require IAM authentication before deployment");
  const active = status.traffic.filter(t => t.percent > 0);
  assert.equal(active.length, 1, "Expected one active production revision");
  assert.equal(active[0].percent, 100);
  console.log(active[0].revisionName);
')"
[[ -n "$task_previous" ]]

# Cloud Run's own HTTP startup probe checks the private candidate against its database.
# The CI identity does not receive run.invoker; external checks use the Vercel app.
gcloud run deploy "$task_service" \
  --project "$task_project" --region "$task_region" --image "$task_image" \
  --service-account "kipp-earth-api@$task_project.iam.gserviceaccount.com" \
  --cpu 1 --memory 512Mi --concurrency 32 --min-instances 0 --max-instances 3 \
  --timeout 60s --cpu-boost --no-traffic --tag candidate \
  --startup-probe "httpGet.path=/ready,httpGet.port=8080,periodSeconds=15,timeoutSeconds=15,failureThreshold=8" \
  --update-env-vars "$task_data_env" \
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
# Successful deployment means the candidate passed the startup readiness probe.

# Promote exactly the revision tested, not whichever revision happens to be latest.
gcloud run services update-traffic "$task_service" --project "$task_project" \
  --region "$task_region" --to-revisions "$task_revision=100" --quiet
task_production="$(gcloud run services describe "$task_service" --project "$task_project" --region "$task_region" --format='value(status.url)')"
if ! bash "$(dirname "$0")/smoke.sh" "https://kipp-earth-trends-lab.vercel.app/api/earth"; then
  echo 'Vercel data check failed; restoring the previous production revision.' >&2
  gcloud run services update-traffic "$task_service" --project "$task_project" \
    --region "$task_region" --to-revisions "$task_previous=100" --quiet
  exit 1
fi
# A future deployment must never accidentally reopen the direct endpoint.
task_status="$(curl --silent --output /dev/null --write-out '%{http_code}' --connect-timeout 10 --max-time 30 "$task_production/v1/catalog")"
[[ "$task_status" == 401 || "$task_status" == 403 ]]
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf 'Deployed `%s`\n\nImage: `%s`\n\nURL: %s\n' "$task_revision" "$task_image" "$task_production" >> "$GITHUB_STEP_SUMMARY"
fi
