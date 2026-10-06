#!/usr/bin/env python3
"""Import an unchanged SQLite desktop database into an ignored local seed file."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3


def iso_date(value, table, record_id):
    text = str(value or '').strip()
    if not text:
        return ''
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(text, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    raise ValueError(f'Invalid date in {table} record {record_id}; original data was preserved')


def quantity(value):
    number = float(str(value or '0').replace(',', '.').strip())
    if not number.is_integer() or number < 0:
        raise ValueError('Quantity must be a non-negative integer')
    return int(number)


def convert(source):
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    def metadata(kind, record_id):
        return dict(id=f'{kind}-{record_id}', revision=1, createdAt=now, updatedAt=now, updatedBy='import')
    with sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Source database failed its integrity check')
        wagons = []
        for row in db.execute('SELECT * FROM vagonlar ORDER BY id'):
            if row['durum'] not in ('Bekliyor', 'Parça bekliyor', 'Bakım devam ediyor', 'Tamamlandı'):
                raise ValueError(f'Unknown status in wagon {row["id"]}')
            wagons.append(dict(**metadata('wagon', row['id']), number=row['vagon_no'] or '',
                entryDate=iso_date(row['giris_tarihi'], 'vagonlar', row['id']),
                channelDate=iso_date(row['kanal_tarihi'], 'vagonlar', row['id']),
                completedDate=iso_date(row['bitis_tarihi'], 'vagonlar', row['id']),
                status=row['durum'], notes=row['aciklama'] or ''))
        parts = []
        for row in db.execute('SELECT * FROM parca_takip ORDER BY id'):
            parts.append(dict(**metadata('part', row['id']), type=row['parca_tipi'] or '',
                brand=row['urun_markasi'] or '', quantity=quantity(row['adet']),
                serialNumber=row['seri_no'] or '', wagonNumber=row['vagon_no'] or '',
                removedDate=iso_date(row['sokulme_tarihi'], 'parca_takip', row['id']),
                sentDate=iso_date(row['gonderilme_tarihi'], 'parca_takip', row['id']),
                returnedDate=iso_date(row['gelme_tarihi'], 'parca_takip', row['id']),
                faultNotes=row['ariza_nedeni'] or ''))
        inventory = [dict(**metadata('inventory', row['id']), type=row['parca_tipi'] or '',
            brand=row['urun_markasi'] or '', quantity=quantity(row['adet']), serialNumber=row['seri_no'] or '')
            for row in db.execute('SELECT * FROM demirbaslar ORDER BY id')]
    return dict(formatVersion=1, version=1, updatedAt=now, wagons=wagons, parts=parts,
                inventory=inventory, users=[], audit=[])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path,
        default=Path('/workspace/imports/vagon-takip/Vagon Takip Programı/vagonlar.db'))
    parser.add_argument('--output', type=Path, default=Path('.local/seed.json'))
    args = parser.parse_args()
    result = convert(args.source)
    if args.output.exists():
        raise SystemExit('Output already exists; refusing to overwrite it')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    args.output.chmod(0o600)
    print('Imported:', len(result['wagons']), 'wagons,', len(result['parts']), 'parts,',
          len(result['inventory']), 'inventory records. Source opened read-only.')
