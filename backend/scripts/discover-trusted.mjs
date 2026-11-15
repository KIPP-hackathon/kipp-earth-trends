#!/usr/bin/env node
// Read-only metadata discovery. This helper never changes the runtime manifest.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { variables } from '../src/registry.ts';
import { trustedColumns } from '../src/trusted-map.ts';

const run = promisify(execFile);
const profile = 'kipp_lakebase_admin';
const env = Object.fromEntries(Object.entries(process.env)
  .filter(([name]) => !name.startsWith('DATABRICKS_')));
env.DATABRICKS_CONFIG_FILE = process.env.DATABRICKS_CONFIG_FILE ||
  join(homedir(), '.config/databricks-kipp-nasa/config');

async function metadata(args) {
  try {
    const { stdout } = await run('databricks', [...args, '--profile', profile, '--output', 'json'], {
      env, encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    return JSON.parse(stdout);
  } catch {
    // CLI error objects can carry environment details and complete response bodies.
    // Never print them, their command logs, or their stdout/stderr.
    throw new Error('METADATA_REQUEST_FAILED');
  }
}
function tableList(value) {
  const tables = Array.isArray(value) ? value : value?.tables;
  if (!Array.isArray(tables)) throw new Error('INVALID_METADATA_RESPONSE');
  return tables;
}
function schemaProblems(table, required) {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const missingColumns = required.filter((name) =>
    !columns.some((column) => column.name === name));
  const time = columns.find((column) => column.name === 'time');
  const timeIsDate = String(time?.type_name ?? time?.type_text ?? '').toUpperCase() === 'DATE';
  return { missingColumns, timeIsDate };
}

const readySources = [];
const blocked = [];
try {
  if (Number(process.versions.node.split('.')[0]) < 24)
    throw new Error('NODE_24_REQUIRED');
  const [upstreamList, destinationList] = await Promise.all([
    metadata(['tables', 'list', 'merra2_shared', 'trusted']),
    metadata(['tables', 'list', 'nasa_hacka_lakebase', 'default']),
  ]);
  const upstreamNames = new Set(tableList(upstreamList).map((table) => table.name));
  const destinationNames = new Set(tableList(destinationList).map((table) => table.name));
  const groups = new Map();
  for (const variable of variables) {
    const group = groups.get(variable.table) ?? [];
    group.push(variable);
    groups.set(variable.table, group);
  }
  // Sequential per-source checks keep CLI/auth load bounded while the team syncs.
  for (const [registryTable, group] of groups) {
    const upstream = `merra2_shared.trusted.${registryTable}`;
    const table = `${registryTable}_trusted`;
    const destination = `nasa_hacka_lakebase.default.${table}`;
    const candidate = { registryTable, variableIds: group.map((variable) => variable.id) };
    const block = (code, details = {}) => blocked.push({ ...candidate, code, ...details });
    if (!upstreamNames.has(registryTable)) {
      block('TRUSTED_UPSTREAM_NOT_FOUND');
      continue;
    }
    if (!destinationNames.has(table)) {
      block('TRUSTED_DESTINATION_NOT_FOUND');
      continue;
    }
    try {
      const [sourceMetadata, destinationMetadata, synced] = await Promise.all([
        metadata(['tables', 'get', upstream]),
        metadata(['tables', 'get', destination]),
        metadata(['postgres', 'get-synced-table', `synced_tables/${destination}`]),
      ]);
      if (sourceMetadata.full_name !== upstream || destinationMetadata.full_name !== destination ||
          destinationMetadata.properties?.source_table !== upstream) {
        block('TRUSTED_LINEAGE_MISMATCH');
        continue;
      }
      const logicalColumns = [...new Set(group.flatMap((variable) => [
        'lat', 'lon', 'time', variable.column,
        ...(variable.coverage ? [variable.coverage] : []),
        ...(variable.qa === 'modis_good' ? ['pixel_reliability', 'vi_quality'] :
          variable.qa === 'ice_valid' ? ['valid_sample'] : []),
      ]))];
      if (logicalColumns.some((name) => !trustedColumns[registryTable]?.[name])) {
        block('REVIEWED_COLUMN_MAPPING_INCOMPLETE');
        continue;
      }
      const required = logicalColumns.map((name) => trustedColumns[registryTable][name]);
      const sourceSchema = schemaProblems(sourceMetadata, required);
      const destinationSchema = schemaProblems(destinationMetadata, required);
      if (sourceSchema.missingColumns.length || destinationSchema.missingColumns.length ||
          !sourceSchema.timeIsDate || !destinationSchema.timeIsDate) {
        block('TRUSTED_SCHEMA_MISMATCH', { sourceSchema, destinationSchema });
        continue;
      }
      const status = synced.status;
      const lastSync = status?.last_sync;
      const started = Date.parse(lastSync?.sync_start_time ?? '');
      const ended = Date.parse(lastSync?.sync_end_time ?? '');
      if (synced.name !== `synced_tables/${destination}` ||
          status?.detailed_state !== 'SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE' ||
          !Number.isFinite(started) || !Number.isFinite(ended) || ended < started ||
          status.ongoing_sync_progress != null) {
        block('TRUSTED_SYNC_NOT_COMPLETE', {
          state: typeof status?.detailed_state === 'string' &&
            /^SYNCED_TABLE_[A-Z_]+$/.test(status.detailed_state) ? status.detailed_state : 'UNKNOWN',
        });
        continue;
      }
      readySources.push({ ...candidate, schema: 'default', table, upstream,
        lastSync: { start: new Date(started).toISOString(), end: new Date(ended).toISOString() } });
    } catch {
      block('TRUSTED_METADATA_UNAVAILABLE');
    }
  }
} catch (error) {
  blocked.push({ code: error?.message === 'NODE_24_REQUIRED' ? 'NODE_24_REQUIRED' : 'CATALOG_METADATA_UNAVAILABLE' });
  process.exitCode = 1;
}
process.stdout.write(`${JSON.stringify({ readySources, blocked }, null, 2)}\n`);
