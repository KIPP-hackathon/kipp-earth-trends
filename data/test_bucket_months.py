"""Synthetic checks for skipping remote months without reading scientific data."""

import io
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError

import numpy as np
import pandas as pd
import xarray as xr

import bucket_months as bucket
import config_sea_ice_concentration_global as ice
import config_gpm_imerg_precipitation_final_late as gpm
import config_grace_jpl_mass_anomaly as grace
import phase_concentration
import water_ice


def snapshot(products):
    return {"bucket": bucket.DEFAULT_BUCKET, "products": {
        product: {"objects": [{"name": f"transient/{product}/{product}_{month.replace('-', '_')}.csv",
                                "size": "100"} for month in months]}
        for product, months in products.items()}}


class InventoryTests(unittest.TestCase):
    def test_nonempty_csv_counts_once_metadata_and_empty_csv_do_not(self):
        s = snapshot({"P": ["2024-01"]})
        s['products']['P']['objects'] += [
            {'name': 'transient/P/2024/P_2024_01.csv', 'size': '100'},
            {'name': 'transient/P/P_2024_02.metadata.json', 'size': '100'},
            {'name': 'transient/P/P_2024_03.csv', 'size': '0'}]
        self.assertEqual(bucket.existing_months(s, 'P'), {'2024-01'})
        with self.assertRaises(KeyError): bucket.existing_months(s, 'Q')

    def test_ranges_preserve_internal_holes_and_leap_month(self):
        self.assertEqual(bucket.missing_ranges('2024-01-01', '2024-04-30', {'2024-01', '2024-03'}),
                         [(date(2024, 2, 1), date(2024, 2, 29)), (date(2024, 4, 1), date(2024, 4, 30))])
        self.assertEqual(bucket.missing_ranges('2024-01-01', '2024-01-31', {'2024-01'}), [])

    def test_gcs_pagination_reads_all_pages(self):
        args = SimpleNamespace(bucket='test-bucket', gcp_account=None, bucket_inventory=None, forwarded=[])
        pages = [io.BytesIO(json.dumps({'items': [{'name': 'transient/P/P_2024_01.csv', 'size': '1'}],
                                       'nextPageToken': 'next'}).encode()),
                 io.BytesIO(json.dumps({'items': [{'name': 'transient/P/P_2024_02.csv', 'size': '1'}]}).encode())]
        with patch.object(bucket.subprocess, 'check_output', return_value='temporary-test-token'), \
             patch.object(bucket, 'urlopen', side_effect=pages) as request, \
             patch.object(Path, 'write_text'):
            s = bucket.inventory(['P'], args)
        self.assertEqual(bucket.existing_months(s, 'P'), {'2024-01', '2024-02'})
        self.assertIn('pageToken=next', request.call_args.args[0].full_url)

    def test_forbidden_is_not_interpreted_as_empty_bucket(self):
        args = SimpleNamespace(bucket='test-bucket', gcp_account=None, bucket_inventory=None, forwarded=[])
        with patch.object(bucket.subprocess, 'check_output', return_value='temporary-test-token'), \
             patch.object(bucket, 'urlopen', side_effect=HTTPError('url', 403, 'Forbidden', {}, None)):
            with self.assertRaises(HTTPError): bucket.inventory(['P'], args)

    def test_offline_requires_explicit_snapshot_and_rejects_wrong_bucket(self):
        args = SimpleNamespace(bucket=bucket.DEFAULT_BUCKET, bucket_inventory=None, forwarded=['--offline'])
        with self.assertRaises(ValueError): bucket.inventory(['P'], args)
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'snapshot.json'
            p.write_text(json.dumps({'bucket': 'another-bucket', 'products': {'P': {'objects': []}}}))
            args.bucket_inventory = p
            with self.assertRaises(ValueError): bucket.inventory(['P'], args)


class ConfigTests(unittest.TestCase):
    def test_poles_are_skipped_independently(self):
        north, south = ice.OUTPUT_PRODUCTS
        s = snapshot({north: ['2024-01'], south: []})
        with patch.object(bucket, 'inventory', return_value=s), patch.object(phase_concentration, 'main') as extract:
            ice.main(['--start', '2024-01-01', '--end', '2024-01-31', '--plan'])
        self.assertEqual(extract.call_count, 1)
        options = extract.call_args.args[0]
        self.assertEqual(options[options.index('--hemispheres') + 1], 'S')

    def test_imerg_final_and_late_existing_ranges_trigger_no_source_calls(self):
        s = snapshot({gpm.SHORT_NAME: list(bucket.requested_months('2024-01-01', '2025-09-30')),
                      gpm.LATE_SHORT_NAME: list(bucket.requested_months('2025-10-01', '2026-10-31'))})
        with patch.object(bucket, 'inventory', return_value=s), patch('imerg.main') as final, patch('imerg_late.main') as late:
            gpm.main(['--start', '2024-01-01', '--end', '2026-10-31'])
        final.assert_not_called(); late.assert_not_called()

    def test_imerg_internal_gap_does_not_repeat_other_months(self):
        s = snapshot({gpm.SHORT_NAME: ['2024-01', '2024-03']})
        with patch.object(bucket, 'inventory', return_value=s), patch('imerg.main') as final, patch('imerg_late.main') as late:
            gpm.main(['--start', '2024-01-01', '--end', '2024-03-31', '--plan'])
        options = final.call_args.args[0]
        self.assertEqual(options[options.index('--start') + 1], '2024-02-01')
        self.assertEqual(options[options.index('--end') + 1], '2024-02-29')
        late.assert_not_called()

    def test_show_missing_never_calls_scientific_extractor(self):
        s = snapshot({grace.OUTPUT_PRODUCT: ['2024-01']})
        with patch.object(bucket, 'inventory', return_value=s), patch.object(water_ice, 'main') as extract:
            grace.main(['--start', '2024-01-01', '--end', '2024-02-29', '--show-missing'])
        extract.assert_not_called()

    def test_grace_retains_cumulative_lookup_but_excludes_existing_month(self):
        s = snapshot({grace.OUTPUT_PRODUCT: ['2024-01']})
        with patch.object(bucket, 'inventory', return_value=s), patch.object(water_ice, 'main') as extract:
            grace.main(['--start', '2024-01-01', '--end', '2024-02-29', '--plan'])
        options = extract.call_args.args[0]
        self.assertEqual(options[options.index('--start') + 1], '2024-01-01')
        self.assertEqual(options[options.index('--skip-months') + 1], '2024-01')

    def test_selected_hemisphere_only_queries_that_pole(self):
        args = SimpleNamespace(raw_dir=Path('/unused'), hemispheres=['S'], plan=True)
        with patch.object(phase_concentration, 'urlopen', return_value=io.BytesIO(b'')) as request:
            phase_concentration.run_concentration(args, pd.Timestamp('2024-01-01'), pd.Timestamp('2024-01-31'))
        self.assertEqual(request.call_count, 1)
        self.assertIn('/south/', request.call_args.args[0])


class GraceExportTests(unittest.TestCase):
    def test_explicit_interval_selects_matching_solution_and_rejects_guesses(self):
        ds = xr.Dataset(
            {'time_bounds': (('time','bounds'),np.array([
                ['2011-12-17T00:00:00','2012-01-15T23:59:59'],
                ['2012-01-01T00:00:00','2012-01-31T23:59:59'],
                ['2015-04-01T00:00:00','2015-04-30T23:59:59'],
                ['2015-04-12T00:00:00','2015-05-11T23:59:59']],dtype='datetime64[s]'))},
            coords={'time':np.array(['2012-01-01','2012-01-16','2015-04-16','2015-04-27'],dtype='datetime64[s]')})
        choices={'2012-01':['2012-01-01','2012-01-31'],'2015-04':['2015-04-01','2015-04-30']}
        first,last=pd.Timestamp('2012-01-01'),pd.Timestamp('2015-04-30')
        found=water_ice.selected_times(ds,first,last,month_selections=choices)
        self.assertEqual(found,{pd.Timestamp('2012-01-01'):1,pd.Timestamp('2015-04-01'):2})
        with self.assertRaises(ValueError):
            water_ice.selected_times(ds,first,last,month_selections={'2012-01':['2012-01-01','2012-01-30']})
        with self.assertRaises(ValueError):
            water_ice.selected_times(ds.drop_vars('time_bounds'),first,last,month_selections=choices)

    def test_ambiguous_month_policy_preserves_gaps_without_averaging_or_shifting(self):
        ds = xr.Dataset(coords={'time': [np.datetime64('2012-01-01'),
                                         np.datetime64('2012-01-16'), np.datetime64('2012-02-15')]})
        start,end = pd.Timestamp('2012-01-01'), pd.Timestamp('2012-02-29')
        with self.assertRaises(ValueError): water_ice.selected_times(ds,start,end)
        self.assertEqual(water_ice.selected_times(ds,start,end,'skip'), {pd.Timestamp('2012-02-01'):2})

    def test_skipped_month_is_never_written_or_aggregated(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'synthetic.nc'
            dataset = xr.Dataset(
                {'lwe_thickness': (('time', 'lat', 'lon'), np.ones((2, 360, 720), dtype='float32'), {'units': 'cm'})},
                coords={'time': [np.datetime64('2024-01-15'), np.datetime64('2024-02-15')],
                        'lat': np.arange(360) * .5 - 89.75, 'lon': np.arange(720) * .5 - 179.75})
            dataset.to_netcdf(path)
            with patch.object(water_ice, 'write_month') as write:
                found = water_ice.export_netcdf(path, 'grace', pd.Timestamp('2024-01-01'),
                    pd.Timestamp('2024-02-29'), Path(d), skip_months={pd.Timestamp('2024-01-01')})
            self.assertEqual(found, {pd.Timestamp('2024-02-01')})
            self.assertEqual(write.call_count, 1)
            self.assertEqual(write.call_args.args[2], pd.Timestamp('2024-02-01'))

    def test_all_months_present_skips_grace_source_lookup(self):
        with patch.object(water_ice, 'grace_files', side_effect=AssertionError('unnecessary download')):
            water_ice.main(['grace', '--start', '2024-01-01', '--end', '2024-02-29',
                            '--skip-months', '2024-01', '2024-02'])


if __name__ == '__main__':
    unittest.main()
