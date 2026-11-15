"""Read saved Databricks Statement API results; no network or third-party packages.

Usage: python ml_experiments/trend_lab_exploration.py RESPONSE.json OUTPUT.json
Exploratory associations only. Positive lag means x precedes y.
"""
import collections
import json
import random
import statistics
import sys


def residuals(rows):
    """OLS residuals after calendar-month fixed effects and a linear time term."""
    groups = collections.defaultdict(list)
    for t, x in rows:
        groups[t % 12].append((t, x))
    means = {m: (statistics.mean(t for t, x in g),
                 statistics.mean(x for t, x in g)) for m, g in groups.items()}
    denominator = sum((t - means[t % 12][0]) ** 2 for t, x in rows)
    slope = sum((t - means[t % 12][0]) * (x - means[t % 12][1])
                for t, x in rows) / denominator
    return [x - means[t % 12][1] - slope * (t - means[t % 12][0])
            for t, x in rows]


def adjusted(rows):
    return statistics.correlation(residuals([(t, x) for t, x, y in rows]),
                                  residuals([(t, y) for t, x, y in rows]))


def interval(rows, block=12, repetitions=1000):
    """Paired moving-calendar-block bootstrap; refit nuisance terms each time.

    Non-circular overlapping blocks retain missing months. Intervals are
    pointwise percentile intervals, not multiplicity-adjusted hypothesis tests.
    """
    rng = random.Random(20261115)
    lookup = {t: (t, x, y) for t, x, y in rows}
    first, last = min(lookup), max(lookup)
    span = last - first + 1
    values = []
    for _ in range(repetitions):
        sample = []
        remaining = span
        while remaining:
            start = rng.randint(first, last - block + 1)
            size = min(block, remaining)
            sample.extend(lookup[t] for t in range(start, start + size) if t in lookup)
            remaining -= size
        values.append(adjusted(sample))
    values.sort()
    return [values[int(.025 * repetitions)], values[int(.975 * repetitions)]]


def main():
    response = json.load(open(sys.argv[1]))
    assert response['status']['state'] == 'SUCCEEDED'
    assert not response['manifest']['truncated']
    assert response['manifest']['total_chunk_count'] == 1
    data = collections.defaultdict(dict)
    for region, variable, date, value, *_ in response['result']['data_array']:
        year, month = map(int, date[:7].split('-'))
        t = year * 12 + month - 1
        assert t not in data[region, variable], 'Duplicate month'
        data[region, variable][t] = float(value)
    results = []
    for region in sorted({r for r, v in data}):
        for x, y in [('rainfall', 'water_storage'), ('temperature', 'rainfall'),
                     ('temperature', 'water_storage')]:
            for lag in [0, 1, 3, 6]:
                a, b = data[region, x], data[region, y]
                rows = [(t, a[t], b[t + lag]) for t in sorted(a) if t + lag in b]
                result = dict(region=region, x=x, y=y, lag=lag, n=len(rows),
                              first_x_month=rows[0][0], last_x_month=rows[-1][0],
                              raw_r=statistics.correlation([x for t, x, y in rows],
                                                           [y for t, x, y in rows]),
                              adjusted_r=adjusted(rows))
                if lag == 0 or (x == 'rainfall' and lag == 1):
                    result['exploratory_pointwise_95_interval'] = interval(rows)
                results.append(result)
    with open(sys.argv[2], 'w') as output:
        json.dump(dict(statement_id=response['statement_id'], block_months=12,
                       bootstrap_replicates=1000, results=results), output, indent=2)
    for result in results:
        if 'exploratory_pointwise_95_interval' in result:
            print(result)


if __name__ == '__main__':
    main()
