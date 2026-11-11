"""Reproducible BPI 2017 pipeline. Python 3.11+, standard library only.

The public artifact retains only application-state transitions and surrogate IDs.
No loan amount, credit score or resource identifier is exported to the website.
"""
from __future__ import annotations
import argparse
import csv
import gzip
import hashlib
import json
import sqlite3
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://data.4tu.nl/file/34c3f44b-3101-4ea9-8281-e38905c68b8d/f3aec4f7-d52c-4217-82f4-57d719a8298c'
DOI = 'https://doi.org/10.4121/uuid:5f3067df-f10b-45da-b98b-86ae4c7a310b'
STATES = ['A_Create Application', 'A_Submitted', 'A_Concept', 'A_Accepted', 'A_Complete', 'A_Validating', 'A_Incomplete', 'A_Pending', 'A_Denied', 'A_Cancelled']
LABELS = ['Création', 'Soumission', 'Préparation', 'Recevabilité', 'Dossier complet', 'Vérification', 'Pièces manquantes', 'À financer', 'Refus', 'Annulation']
TERMINAL = {7: 'pending', 8: 'denied', 9: 'cancelled'}

def attrs(node):
    return {e.get('key'): e.get('value') for e in node if e.tag.split('}')[-1] != 'event' and e.get('key')}

def milliseconds(value):
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        raise ValueError('Timestamp without timezone')
    return round(dt.timestamp() * 1000)

def compact_trace(trace, index):
    meta = attrs(trace)
    events, original_times = [], []
    raw_count, unknown = 0, 0
    for e in trace:
        if e.tag.split('}')[-1] != 'event':
            continue
        raw_count += 1
        a = attrs(e)
        name = a.get('concept:name', '')
        if not name.startswith('A_'):
            continue
        if name not in STATES:
            unknown += 1
            continue
        stamp = milliseconds(a['time:timestamp'])
        original_times.append(stamp)
        events.append([STATES.index(name), stamp])
    if not events:
        raise ValueError(f'Trace {index} has no known application state')
    reordered = original_times != sorted(original_times)
    # Stable sort: source order is preserved for tied timestamps.
    events.sort(key=lambda x: x[1])
    dedup = []
    for event in events:
        if not dedup or event != dedup[-1]:
            dedup.append(event)
    status = TERMINAL.get(dedup[-1][0], 'open')
    start = dedup[0][1]
    compact = [[state, round((stamp - start) / 1000, 3)] for state, stamp in dedup]
    row = {
        'id': f'FL-{index:05d}',
        'start': start,
        'month': datetime.fromtimestamp(start / 1000, timezone.utc).strftime('%Y-%m'),
        'type': meta.get('ApplicationType', 'Unknown'),
        'status': status,
        'duration': round((dedup[-1][1] - start) / 86400000, 6),
        'events': compact,
        'rawEvents': raw_count,
    }
    return row, {'rawEvents': raw_count, 'applicationEvents': len(events), 'duplicatesRemoved': len(events)-len(dedup), 'reorderedTraces': int(reordered), 'unknownStates': unknown}

def extract(path):
    rows, quality = [], Counter()
    with gzip.open(path, 'rb') as f:
        for _, elem in ET.iterparse(f, events=('end',)):
            if elem.tag.split('}')[-1] == 'trace':
                row, counts = compact_trace(elem, len(rows) + 1)
                rows.append(row)
                quality.update(counts)
                elem.clear()
    return rows, dict(quality)

def build(source_path=None):
    raw = ROOT / 'data/raw/BPI_Challenge_2017.xes.gz' if source_path is None else Path(source_path)
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists():
        request = urllib.request.Request(SOURCE, headers={'User-Agent': 'FlowLens/1.0 public research portfolio'})
        with urllib.request.urlopen(request, timeout=120) as response:
            content = response.read()
        if not content.startswith(b'\x1f\x8b'):
            raise ValueError('Source response is not a gzip XES log')
        raw.write_bytes(content)
    digest = hashlib.file_digest(raw.open('rb'), 'sha256').hexdigest()
    # Verify the frozen artifact when it already exists: changed upstream data is not silently accepted.
    manifest_path = ROOT / 'public/data/manifest.json'
    if manifest_path.exists() and source_path is None:
        expected = json.loads(manifest_path.read_text(encoding='utf-8'))['sha256']
        if expected != digest:
            raise ValueError(f'Upstream checksum changed: expected {expected}, observed {digest}')
    rows, quality = extract(raw)
    if len(rows) != 31509 or quality['rawEvents'] != 1202267:
        raise ValueError('Unexpected BPI 2017 full-log identity or incomplete source')
    output = ROOT / 'public/data'
    processed = ROOT / 'data/processed'
    output.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)
    db = processed / 'flowlens.sqlite'
    with sqlite3.connect(db) as con:
        con.executescript((ROOT / 'sql/schema.sql').read_text(encoding='utf-8'))
        con.execute('DELETE FROM transitions')
        con.execute('DELETE FROM cases')
        con.executemany('INSERT INTO cases VALUES (?,?,?,?,?,?,?)', [(r['id'], r['start'], r['month'], r['type'], r['status'], r['duration'], r['rawEvents']) for r in rows])
        con.executemany('INSERT INTO transitions VALUES (?,?,?,?)', [(r['id'], i, state, offset) for r in rows for i, (state, offset) in enumerate(r['events'])])
    with (processed / 'cases.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'start', 'month', 'type', 'status', 'duration', 'rawEvents'])
        writer.writeheader()
        writer.writerows([{k:v for k,v in r.items() if k != 'events'} for r in rows])
    payload = {
        'citation': 'van Dongen, Boudewijn (2017): BPI Challenge 2017. Version 1. 4TU.ResearchData.',
        'sourceDoi': DOI,
        'licenseUrl': 'https://doi.org/10.4121/resource:terms_of_use',
        'nonCommercialOnly': True,
        'states': STATES, 'labels': LABELS, 'cases': rows
    }
    (output / 'cases.json').write_text(json.dumps(payload, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
    manifest = {
        'dataset': 'BPI Challenge 2017', 'version': 1, 'source': SOURCE, 'doi': DOI,
        'citation': 'van Dongen, Boudewijn (2017): BPI Challenge 2017. Version 1. 4TU.ResearchData.',
        'license': '4TU General Terms of Use', 'licenseUrl': 'https://doi.org/10.4121/resource:terms_of_use',
        'sha256': digest, 'sourceBytes': raw.stat().st_size, 'cases': len(rows), 'quality': quality,
        'start': min(r['start'] for r in rows),
        'end': max(r['start'] + r['events'][-1][1]*1000 for r in rows),
        'statusCounts': dict(Counter(r['status'] for r in rows)),
        'artifact': 'All cases, application states only. IDs replaced with sequential surrogates. No resource, credit score or amount.',
        'definition': 'Duration is elapsed calendar time from first to last observed application state. Terminal outcomes: A_Pending, A_Denied, A_Cancelled. Open cases excluded from completed-duration KPIs.'
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'cases': len(rows), 'quality': quality, 'sha256': digest, 'statusCounts': manifest['statusCounts']}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path)
    build(parser.parse_args().source)
