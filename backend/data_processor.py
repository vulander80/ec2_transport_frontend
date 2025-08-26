import json
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from pathlib import Path

def output_json(filename, input_data, *, pretty=True, dirpath="."):
    path = Path(dirpath) / f"{filename}.json"
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(
            input_data,
            json_file,
            indent=(4 if pretty else None),
            ensure_ascii=False,
            default=_json_default,
        )

def _json_default(o):
    if isinstance(o, (datetime, date)):
        # e.g. "2025-08-15T13:05:00" / "2025-08-15"
        return o.isoformat()
    if isinstance(o, UUID):
        return str(o)
    if isinstance(o, Decimal):
        # choose str(o) if you need exact precision in JSON
        return float(o)
    # Add more custom types here if needed
    return str(o)  # fallback

def get_csv(filename):
    get_encoding = detect_encoding(filename)
    data = []
    record_count = 0

    with open(f"{filename}.csv", mode='r', newline='', encoding=get_encoding) as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            data.append(row)
            record_count += 1

    if data:
        return data
    else:
        return None
        

def get_json(path):
    file_path = f'{path}.json'
    
    if not os.path.isfile(file_path) or os.path.getsize(file_path) == 0:
        return None

    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
            return data if data else None
        except json.JSONDecodeError:
            return None


def detect_encoding(file_path, num_bytes=10000):
    with open(f"{file_path}.csv", 'rb') as f:
        raw_data = f.read(num_bytes)
        result = chardet.detect(raw_data)
        return result['encoding']
    
def convert_txt_to_csv(filename):

    # Read from text file
    with open(f'{filename}.txt', 'r', newline='', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        data = list(reader)

    print(data)
    '''# Write to CSV file
    with open(f'{filename}.csv', 'w', newline='', encoding='utf-8') as outfile:
        writer = csv.writer(outfile)
        writer.writerows(data)'''
