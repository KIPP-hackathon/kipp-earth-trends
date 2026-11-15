"""Inventory existing monthly CSV objects before running historical extractors.

Only object presence is checked, not scientific completeness of its contents.
Network/auth failures are errors, never interpreted as an empty bucket.
"""

import calendar
import json
import re
import subprocess
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_BUCKET = "nasa-earth-trends-lab-raw"


def add_options(parser):
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    parser.add_argument("--gcp-account", help="Optional gcloud account; defaults to the active account.")
    parser.add_argument("--bucket-inventory", type=Path,
                        help="Use an explicit saved inventory instead of querying GCS.")
    parser.add_argument("--show-missing", action="store_true",
                        help="Only list months absent from GCS; do not query/download scientific sources.")


def inventory(products, args):
    products = list(dict.fromkeys(products))
    if "--offline" in getattr(args, "forwarded", []) and not args.bucket_inventory:
        raise ValueError("--offline requires --bucket-inventory to avoid network access.")
    if args.bucket_inventory:
        result = json.loads(args.bucket_inventory.read_text())
        if result.get("bucket") != args.bucket:
            raise ValueError("Saved inventory belongs to a different bucket.")
        if any(product not in result.get("products", {}) for product in products):
            raise ValueError("Saved inventory does not include every requested product.")
        print(f"Saved bucket inventory: {args.bucket_inventory}; checked {result.get('checked_at_utc', 'unknown')}")
        return result
    command = ["gcloud", "auth", "print-access-token"]
    if args.gcp_account:
        command.append("--account=" + args.gcp_account)
    # Capture tokens in memory only; never write/log the credential itself.
    token = subprocess.check_output(command, text=True).strip()
    result = {"bucket": args.bucket, "checked_at_utc": datetime.now(timezone.utc).isoformat(), "products": {}}
    for product in products:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", product):
            raise ValueError("Invalid product prefix.")
        objects, page = [], None
        while True:
            query = {"prefix": f"transient/{product}/", "maxResults": 1000,
                     "fields": "nextPageToken,items(name,size,generation,md5Hash,crc32c)"}
            if page:
                query["pageToken"] = page
            url = f"https://storage.googleapis.com/storage/v1/b/{args.bucket}/o?" + urlencode(query)
            with urlopen(Request(url, headers={"Authorization": "Bearer " + token}), timeout=45) as response:
                data = json.load(response)
            if "error" in data:
                raise ValueError("GCS returned an error; refusing to assume missing data.")
            objects.extend(data.get("items", []))
            page = data.get("nextPageToken")
            if not page:
                break
        result["products"][product] = {"objects": objects}
    directory = Path(__file__).resolve().parents[1] / "artifacts"
    directory.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = directory / f"bucket-months-{stamp}.json"
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Bucket inventory saved: {path}")
    return result


def existing_months(snapshot, product):
    # A missing product key is an incomplete inventory, not an empty prefix.
    objects = snapshot["products"][product]["objects"]
    months = set()
    for obj in objects:
        name = obj["name"]
        if not name.startswith(f"transient/{product}/"):
            raise ValueError("Object does not belong to the requested product prefix.")
        match = re.search(r"_(\d{4})_(\d{2})\.csv$", name)
        if match and int(obj["size"]) > 0:
            months.add(date(int(match[1]), int(match[2]), 1).strftime("%Y-%m"))
    return months


def requested_months(start, end):
    first, last = date.fromisoformat(str(start)), date.fromisoformat(str(end))
    if first.day != 1 or last.day != calendar.monthrange(last.year, last.month)[1] or first > last:
        raise ValueError("Expected complete monthly bounds, in chronological order.")
    cursor = first
    while cursor <= last:
        yield cursor.strftime("%Y-%m")
        cursor = date(cursor.year + (cursor.month == 12), cursor.month % 12 + 1, 1)


def missing_ranges(start, end, existing):
    wanted = list(requested_months(start, end))
    groups, first, last = [], None, None
    for month in wanted:
        if month in existing:
            if first:
                groups.append((first, last))
                first = last = None
        else:
            first = first or month
            last = month
    if first:
        groups.append((first, last))
    return [(date.fromisoformat(a + "-01"),
             date(int(b[:4]), int(b[5:]), calendar.monthrange(int(b[:4]), int(b[5:]))[1]))
            for a, b in groups]


def describe(snapshot, product, start, end):
    existing = existing_months(snapshot, product)
    requested = set(requested_months(start, end))
    ranges = missing_ranges(start, end, existing)
    print(f"{product}: skip {len(requested & existing)} existing months; "
          f"{len(requested - existing)} months absent from bucket.")
    for first, last in ranges:
        print(f"  Missing: {first} to {last}")
    return existing, ranges
