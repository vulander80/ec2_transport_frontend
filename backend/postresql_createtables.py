import psycopg2
from psycopg2.extras import RealDictCursor
import os
import time
#from datetime import datetime, date, timedelta
from datetime import datetime, timedelta
from uuid import uuid4
import json
import csv
import re
import data_processor
import pytz
from syd_trains_data import get_sydneytrains
import uuid
import re
import pandas as pd

sydney_tz = pytz.timezone("Australia/Sydney")
today = datetime.now(sydney_tz).date()
UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$")
DT_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$")


def infer_api_pg_type(key, value):
    """Return a PostgreSQL type for a single value from the API payload."""
    if key == "db_id" and isinstance(value, str) and UUID_RE.match(value):
        return "UUID"
    if key in ("latitude", "longitude"):
        return "DOUBLE PRECISION"
    if key == "schedule_relationship":
        return "INTEGER"
    if key == "retrieved_at" and isinstance(value, str) and DT_RE.match(value):
        return "TIMESTAMP WITHOUT TIME ZONE"
    # Fallbacks by Python type
    if isinstance(value, bool):
        return "BOOLEAN"
    if isinstance(value, int):
        return "INTEGER"
    if isinstance(value, float):
        return "DOUBLE PRECISION"
    return "TEXT"

def normalize_value_for_db(key, value):
    """Coerce common fields to correct Python types for psycopg2."""
    if value is None:
        return None
    if key == "retrieved_at" and isinstance(value, str) and DT_RE.match(value):
        # "YYYY-MM-DD HH:MM:SS"
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    if key == "schedule_relationship" and isinstance(value, str) and value.isdigit():
        return int(value)
    if key in ("latitude", "longitude") and isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    if key == "db_id" and isinstance(value, str) and UUID_RE.match(value):
        # Let psycopg2 cast from string; this is optional
        return value
    return value

def create_table_from_payload(conn, table_name, sample_record):
    """Create table with columns inferred from a sample record."""
    cur = conn.cursor()
    cols_sql = []
    for k, v in sample_record.items():
        coltype = infer_api_pg_type(k, v)
        if k == "db_id":
            cols_sql.append(f'"{k}" {coltype} PRIMARY KEY')
        else:
            cols_sql.append(f'"{k}" {coltype}')
    sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" ({", ".join(cols_sql)});'
    cur.execute(sql)
    conn.commit()
    cur.close()

def sync_columns_from_payload(conn, table_name, sample_record):
    """If table exists, add any payload keys that aren't columns yet."""
    existing = set(get_columns(table_name) or [])
    to_add = []
    for k, v in sample_record.items():
        if k not in existing:
            to_add.append((k, infer_api_pg_type(k, v)))
    if not to_add:
        return
    cur = conn.cursor()
    for k, typ in to_add:
        cur.execute(f'ALTER TABLE "{table_name}" ADD COLUMN "{k}" {typ};')
    conn.commit()
    cur.close()

def upsert_payload(conn, table_name, records):
    """UPSERT list[dict] into table_name on (db_id)."""
    if not records:
        return
    # Use keys from first record to define columns/order
    keys = list(records[0].keys())
    cols = ", ".join(f'"{k}"' for k in keys)
    placeholders = ", ".join(["%s"] * len(keys))
    updates = ", ".join(f'"{k}" = EXCLUDED."{k}"' for k in keys if k != "db_id")
    sql = f'''
        INSERT INTO "{table_name}" ({cols})
        VALUES ({placeholders})
        ON CONFLICT ("db_id") DO UPDATE SET
        {updates};
    '''
    cur = conn.cursor()
    for item in records:
        values = [normalize_value_for_db(k, item.get(k)) for k in keys]
        cur.execute(sql, values)
    conn.commit()
    cur.close()

def ensure_list_of_dicts(payload):
    """Accept a dict, list[dict], or generator and return list[dict]."""
    if payload is None:
        return []
    if isinstance(payload, dict):
        return [payload]
    # If it's an iterator/generator of dicts:
    try:
        first = next(iter(payload))
        # If we got a dict, reconstruct list
        if isinstance(first, dict):
            return [first] + [d for d in payload][0:]
    except TypeError:
        pass
    # If it's already a list
    if isinstance(payload, list) and (not payload or isinstance(payload[0], dict)):
        return payload
    raise TypeError("Expected dict or list[dict] from API payload.")












def parse_time_fields(time_str):
    hours, minutes, seconds = map(int, time_str.split(":"))
    rollover_days = hours // 24
    adjusted_hours = hours % 24
    adjusted_time = f"{adjusted_hours:02}:{minutes:02}:{seconds:02}"
    return adjusted_time, rollover_days

def get_columns(table_name):
    url = os.environ.get("DATABASE_URL")
    col_list = []
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '{table_name}';
        """

        cur.execute(query)
        columns = cur.fetchall()

        #print("Columns in vehicle_position:")
        for col_name, data_type in columns:
            col_list.append(col_name)

        cur.close()
        conn.close()
        return col_list

    except Exception as e:
        print("❌ Failed to fetch columns:", e)
        return None

def view_item():
    url = os.environ.get("DATABASE_URL")

    try:
        with psycopg2.connect(url) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM veh_pos4;")
                rows = cur.fetchall()
                return rows  # This will be a list of dictionaries with field names
    except Exception as e:
        print("❌ Failed to fetch records:", e)
        return []

def add_item():
    url = os.environ.get("DATABASE_URL")

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        insert_query = """
        INSERT INTO vehicle_position (
            retrieved_at, schedule_relationship, latitude, longitude, label,
            entity_id, trip_id, route_id, vehicle_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """

        # Example data - replace with your actual values
        data = (
            datetime.utcnow(),   # retrieved_at as current timestamp UTC
            0,                  # schedule_relationship as integer (e.g. 0)
            -33.8675,           # latitude (example Sydney coords)
            151.2070,           # longitude
            "Train A",          # label text
            "entity_123",       # entity_id string
            "trip_456",         # trip_id string
            "route_789",        # route_id string
            "vehicle_101"       # vehicle_id string
        )

        cur.execute(insert_query, data)
        conn.commit()

        print("✅ Inserted one row into vehicle_position.")

        cur.close()
        conn.close()

    except Exception as e:
        print("❌ Insert failed:", e)

def add_payload(payload_json):

    url = os.environ.get("DATABASE_URL")

    insert_query = """
    INSERT INTO veh_pos4 (
        db_id, entity_id, trip_id, route_id, schedule_relationship, latitude, longitude, vehicle_id, label, retrieved_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        for item in payload_json:
            # Convert retrieved_at string to datetime object
            retrieved_at_dt = datetime.strptime(item["retrieved_at"], "%Y-%m-%d %H:%M:%S")

            data = (
                item["db_id"],
                item["entity_id"],
                item["trip_id"],
                item["route_id"],
                item["schedule_relationship"],
                item["latitude"],
                item["longitude"],
                item["vehicle_id"],
                item["label"],
                retrieved_at_dt
            )

            cur.execute(insert_query, data)

        conn.commit()
        print(f"✅ Inserted {len(payload_json)} rows into veh_pos4.")

        cur.close()
        conn.close()

    except Exception as e:
        print("❌ Insert failed:", e)

def table_exists(table_name):
    url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = """
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = %s
        );
        """
        cur.execute(query, (table_name,))
        exists = cur.fetchone()[0]

        cur.close()
        conn.close()
        return exists

    except Exception as e:
        print("❌ Failed to check table existence:", e)
        return False

def detect_postgres_type(value):
    if value == "":
        return None  # Empty - infer from others or default to TEXT
    
    # Check for integer
    if re.match(r'^-?\d+$', value):
        return "INTEGER"
    
    # Check for float
    if re.match(r'^-?\d*\.\d+$', value):
        return "FLOAT"
    
    # Check for time format (HH:MM:SS)
    try:
        datetime.strptime(value, "%H:%M:%S")
        return "INTEGER"
    except ValueError:
        pass

    # Otherwise, treat as text
    return "TEXT"

def create_table_from_header(table_name, header, column_types):


    id_bypass = [
        {'tname': 'station_names','pri_key': 'stop_id','col_type': 'text'},
        {'tname': 'station_routes','pri_key': 'route_id','col_type': 'text'},
    ]

    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)
    create_id = True
    set_pri_key = 'id'
    set_coltype = 'SERIAL'
    for bypass in id_bypass:
        b_tname = bypass['tname']
        if table_name == b_tname:
            create_id = False
            set_pri_key = bypass['pri_key']
            set_coltype = 'TEXT'
    
    if create_id:
        columns_sql = [f'{set_pri_key} {set_coltype} PRIMARY KEY']
    else:
        columns_sql = [f'{set_pri_key} {set_coltype} PRIMARY KEY']
        header.remove(set_pri_key)


    for col in header:
        col_type = column_types.get(col, 'TEXT')
        columns_sql.append(f'"{col}" {col_type}')

    columns_def = ", ".join(columns_sql)
    
    sql = f'CREATE TABLE "{table_name}" ({columns_def});'
    
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()

def clear_table(table_name):
    url = os.environ.get("DATABASE_URL")

    if not url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        # Clear the table
        cur.execute(f"TRUNCATE TABLE {table_name};")

        # Commit the transaction
        conn.commit()

        cur.close()
        conn.close()
        print(f"✅ {table_name} table has been cleared.")
        return True

    except Exception as e:
        print("❌ Failed to clear stop_times table:", e)
        return False

def infer_column_type(values):
    time_pattern = re.compile(r'^\d{2}:\d{2}:\d{2}(\+\d{4})?$')

    is_integer = True
    is_float = True
    is_time = True

    for v in values:
        if v == '':
            continue
        if not v.isdigit():
            is_integer = False
        try:
            float(v)
        except ValueError:
            is_float = False
        if not time_pattern.match(v):
            is_time = False

    if is_time:
        return 'TIME'
    elif is_integer:
        return 'INTEGER'
    elif is_float:
        return 'FLOAT'
    else:
        return 'TEXT'


def create_tables(file_list):
    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)

    for fl in file_list:
        set_table = fl['table']
        exists = table_exists(set_table)
        set_current = False
        if set_table == 'current_trains':
            set_current = True
        if exists:
            print(f'table {set_table} found')
            clear_table(set_table)
        else:
            if not set_current:
                filename = f"./gtfs_feed_sydtrains/{fl['filename']}"
                with open(filename, newline='', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    header = next(reader)
                    data_rows = list(reader)

                    # Build value list for each column
                    column_values = {col: [] for col in header}
                    for row in data_rows:
                        for i, col in enumerate(header):
                            if i < len(row) and row[i] != '':
                                column_values[col].append(row[i])

                    # Infer types for each column
                    column_types = {}
                    for col in header:
                        column_types[col] = infer_column_type(column_values[col])
                    
                    create_table_from_header(set_table, header, column_types)
            
               
                


def gtfs_time_to_seconds(value):
    """
    Converts GTFS time string (e.g., '24:00:24') to seconds since midnight.
    """
    if value == "":
        return None
    try:
        h, m, s = map(int, value.split(":"))
        return h * 3600 + m * 60 + s
    except Exception as e:
        print(f"⚠️ Failed to convert GTFS time: {value} -> {e}")
        return None

def clean(value, col):
    if value == "":
        return None

    if col in ['arrival_time', 'departure_time']:
        return gtfs_time_to_seconds(value)

    if col in ['stop_sequence', 'pickup_type', 'drop_off_type']:
        return int(value)

    if col == 'shape_dist_traveled':
        return float(value)

    return value

def table_stoptimes(conn,table_name,file_path):

    gather_data = []
    # Get ordered column names of the target table
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    columns = [row[0] for row in cur.fetchall()]

    # If 'id' is in the table, add a UUID for it
    if 'id' in columns:
        include_id = True
        columns_without_id = [col for col in columns if col != 'id']
    else:
        include_id = False
        columns_without_id = columns

    # Helper function to clean and convert values
    def clean(value, col):
        if value == "":
            return None
        if col in ['stop_sequence', 'pickup_type', 'drop_off_type']:
            return int(value)
        if col == 'shape_dist_traveled':
            return float(value)
        return value

    df = pd.read_csv(file_path)
    df = df.dropna(how='all', axis=1)
    print(f"Rows: {len(df)}, Columns: {len(df.columns)}")

    for chunk in pd.read_csv(file_path, chunksize=100000):
        print(chunk.iloc[0].to_dict())  # First row of this chunk
        break 
    
    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        #rows = list(reader)

        count = 0
        for row in reader:
            count += 1
            
            
            # Parse and adjust arrival time
            arrival_time_str, arrival_rollover = parse_time_fields(row["arrival_time"])
            arrival_date = today + timedelta(days=arrival_rollover)
            arrival_timestamp = datetime.strptime(
                f"{arrival_date} {arrival_time_str}", "%Y-%m-%d %H:%M:%S"
            )

            # Parse and adjust departure time
            departure_time_str, departure_rollover = parse_time_fields(row["departure_time"])
            departure_date = today + timedelta(days=departure_rollover)
            departure_timestamp = datetime.strptime(
                f"{departure_date} {departure_time_str}", "%Y-%m-%d %H:%M:%S"
            )

            # Set date and time fields (without timezone)
            row["arrival_date"] = arrival_timestamp.strftime("%Y-%m-%d")
            row["arrival_time"] = arrival_timestamp.strftime("%H:%M:%S")

            row["departure_date"] = departure_timestamp.strftime("%Y-%m-%d")
            row["departure_time"] = departure_timestamp.strftime("%H:%M:%S")

            # Add to gather_data
            gather_data.append(row)

            # Construct cleaned row
            values = [clean(row.get(col, ""), col) for col in columns_without_id]
            cleaned_row = values
            insert_columns = columns_without_id

            # SQL components
            placeholders = ", ".join(["%s"] * len(insert_columns))
            updates = ", ".join([
                f"{col} = EXCLUDED.{col}"
                for col in columns_without_id
                if col not in ("trip_id", "stop_sequence")  # preserve conflict keys
            ])

            query = f"""
                INSERT INTO {table_name} ({', '.join(insert_columns)})
                VALUES ({placeholders})
                ON CONFLICT (id) DO UPDATE SET
                {updates};
            """
            cur.execute(query, cleaned_row)

        data_processor.output_json(f'sample_output01',gather_data)


    conn.commit()
    print(f"✅ {table_name} data upserted successfully")

    if conn:
        cur.close()

def table_stations(conn, table_name, file_path):
    gather_data = []
    cur = conn.cursor()

    # Get column names and data types
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    columns_info = cur.fetchall()  # list of tuples (column_name, data_type)

    columns = [col for col, _ in columns_info]

    # Determine if 'id' column is present and its type
    id_column_type = None
    for col, dtype in columns_info:
        if col == 'id':
            id_column_type = dtype
            break

    if id_column_type == 'uuid':
        include_id = True  # We will provide UUID
        columns_without_id = [col for col in columns if col != 'id']
    else:
        include_id = False  # Let DB auto-generate id or no id column
        columns_without_id = columns

    def clean(value, col):
        if value == "":
            return None
        if col in ['location_type', 'wheelchair_boarding']:
            try:
                return int(value)
            except ValueError:
                return None
        if col in ['stop_lat', 'stop_lon']:
            try:
                return float(value)
            except ValueError:
                return None
        return value

    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        for row in rows[0:100]:
            values = [clean(row.get(col, ""), col) for col in columns_without_id]

            if include_id:
                values.insert(0, str(uuid4()))
                insert_columns = ['id'] + columns_without_id
            else:
                insert_columns = columns_without_id

            placeholders = ", ".join(["%s"] * len(insert_columns))
            updates = ", ".join([
                f"{col} = EXCLUDED.{col}"
                for col in columns_without_id
                if col != "stop_id"  # assuming stop_id is unique and should not be updated
            ])

            gather_data.append(row)

            query = f"""
                INSERT INTO {table_name} ({', '.join(insert_columns)})
                VALUES ({placeholders})
                ON CONFLICT (stop_id) DO UPDATE SET
                {updates};
            """
            cur.execute(query, values)

    # Assuming data_processor is defined elsewhere
    #data_processor.output_json('sample_station02', gather_data)
    conn.commit()
    print(f"✅ {table_name} data upserted successfully")

    if conn:
        cur.close()

def trip_data(conn,table_name,file_path):
    gather_data = []
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    columns = [row[0] for row in cur.fetchall()]

    # If 'id' is in the table, add a UUID for it
    if 'id' in columns:
        include_id = False  # Don't insert ID manually
        columns_without_id = [col for col in columns if col != 'id']
    else:
        columns_without_id = columns

    # Helper function to clean and convert values
    def clean(value, col):
        if value == "":
            return None
        if col in ['location_type', 'wheelchair_boarding']:
            return int(value)
        if col in ['stop_lat', 'stop_lon']:
            return float(value)
        return value

    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Prepare data row
            values = [clean(row.get(col, ""), col) for col in columns_without_id]

            # If ID is needed, insert UUID
            if include_id:
                values.insert(0, str(uuid4()))
                insert_columns = ['id'] + columns_without_id
            else:
                insert_columns = columns_without_id

            # SQL components
            placeholders = ", ".join(["%s"] * len(insert_columns))
            updates = ", ".join([
                f"{col} = EXCLUDED.{col}"
                for col in columns_without_id
                if col != "stop_id"  # assuming stop_id is unique and should not change
            ])
            gather_data.append(row)
            query = f"""
                INSERT INTO {table_name} ({', '.join(insert_columns)})
                VALUES ({placeholders})
                ON CONFLICT (id) DO UPDATE SET
                {updates};
            """
            cur.execute(query, values)

        data_processor.output_json('sample_trip',gather_data)

    conn.commit()
    print(f"✅ {table_name} data upserted successfully")

    if conn:
        cur.close()

def route_data(conn,table_name,file_path):
    gather_data = []
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    columns = [row[0] for row in cur.fetchall()]

    # If 'id' is in the table, add a UUID for it
    if 'id' in columns:
        include_id = True  # Provide a UUID
        columns_without_id = [col for col in columns if col != 'id']
    else:
        include_id = False
        columns_without_id = columns

    # Helper function to clean and convert values
    def clean(value, col):
        if value == "":
            return None
        if col in ['location_type', 'wheelchair_boarding']:
            return int(value)
        if col in ['stop_lat', 'stop_lon']:
            return float(value)
        return value

    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Prepare data row
            values = [clean(row.get(col, ""), col) for col in columns_without_id]

            # If ID is needed, insert UUID
            if include_id:
                values.insert(0, str(uuid4()))
                insert_columns = ['id'] + columns_without_id
            else:
                insert_columns = columns_without_id

            # SQL components
            placeholders = ", ".join(["%s"] * len(insert_columns))
            updates = ", ".join([
                f"{col} = EXCLUDED.{col}"
                for col in columns_without_id
                if col != "stop_id"  # assuming stop_id is unique and should not change
            ])
            gather_data.append(row)
            query = f"""
                INSERT INTO {table_name} ({', '.join(insert_columns)})
                VALUES ({placeholders})
                ON CONFLICT (route_id) DO UPDATE SET
                {updates};
            """
            cur.execute(query, values)

        data_processor.output_json('sample_route01',gather_data)

    conn.commit()
    print(f"✅ {table_name} data upserted successfully")

    if conn:
        cur.close()
        

def upsert_stop_times(file_list):

    gather_data = []
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("❌ DATABASE_URL environment variable not set")
        return

    for fl in file_list:
        file_path = f"./gtfs_feed_sydtrains/{fl['filename']}"
        table_name = fl['table']

        try:
            conn = psycopg2.connect(url)
            print(table_name)
            if table_name == 'stop_times':
                print(f'processing {table_name}')
                table_stoptimes(conn,table_name,file_path)
            
            if table_name == 'station_names':
                table_stations(conn,table_name,file_path)
            
            if table_name == 'trip_data':
                trip_data(conn,table_name,file_path)

            if table_name == 'station_routes':
                route_data(conn,table_name,file_path)
            
            conn.close()

        
        except Exception as e:
            print(f"❌ Failed to upsert {table_name}:", e)

        



def chk_tableitems(file_list):
    url = os.environ.get("DATABASE_URL")
    row_count = 0
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        count = 0
        for fl in file_list:
            count += 1
            set_table = fl['table']
            
            query = f"""
            SELECT COUNT(*) 
            FROM {set_table};
            """
            
            cur.execute(query)
            result = cur.fetchone()
            row_count = result[0] if result else 0
            
            
            print(f"#{count} Table {set_table} found how many items: {row_count}")
            #return row_count
        
        cur.close()
        conn.close()
        
        
    except Exception as e:
        print("❌ Failed to fetch row count:", e)
        return None



def current_trains_import():
    start_time = time.time()
    table_name = "current_trains"
    print(f"\n\n##### Fetching API payload #######\n")
    payload = get_sydneytrains()  # may return dict or list[dict]
    records = ensure_list_of_dicts(payload)
    if not records:
        print("⚠️ No records returned from API.")
        return

    url = os.environ.get("DATABASE_URL")
    if not url:
        print("❌ DATABASE_URL not set")
        return

    conn = psycopg2.connect(url)

    try:
        if not table_exists(table_name):
            print(f"🆕 Creating table {table_name} from API payload shape...")
            create_table_from_payload(conn, table_name, records[0])
        else:
            # Make sure any new fields in the payload are added as columns
            sync_columns_from_payload(conn, table_name, records[0])

        print(f"⬆️  Inserting/Updating {len(records)} row(s) into {table_name}...")
        upsert_payload(conn, table_name, records)

        print("✅ Done.")
    finally:
        conn.close()

    elapsed = time.time() - start_time
    print(f"✅ Script completed in {elapsed:.2f} seconds.")


def postre_main():
    start_time = time.time()

    file_list = [{'table': 'stop_times', "filename": 'stop_times.txt'},{'table': 'trip_data', "filename": 'trips.txt'},{'table': 'station_routes', "filename": 'routes.txt'},{'table': 'station_names', "filename": 'stops.txt'} ]
    #file_list = [{'table': 'stop_times', "filename": 'stop_times.txt'} ]

    #file_list = [{'table': 'station_routes', "filename": 'routes.txt'}]
    print(file_list)
    print(f"\n\n##### Checking tables #######\n")
    chk_tableitems(file_list)
    print(f"\n\n##### Creating / Clearing tables #######\n")
    create_tables(file_list)
    print(f"\n\n##### uploading info #######\n")
    upsert_stop_times(file_list)

    end_time = time.time()
    elapsed = end_time - start_time
    print(f"✅ Script completed in {elapsed:.2f} seconds.")


def create_delay_trips_table():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("❌ DATABASE_URL not set in environment.")
        return

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        # Drop table if it already exists (optional)
        cur.execute("DROP TABLE IF EXISTS delay_trips;")

        # Create table
        create_query = """
        CREATE TABLE delay_trips (
            tripid TEXT PRIMARY KEY,
            routename TEXT,
            trip_start TIME,
            trip_end TIME,
            active BOOLEAN,
            gmap_url TEXT,
            time_idle INTEGER,
            train_idle BOOLEAN,
            route_id TEXT,
            route_shortname TEXT
        );
        """
        cur.execute(create_query)
        conn.commit()

        print("✅ Table 'delay_trips' created successfully.")

        cur.close()
        conn.close()
    except Exception as e:
        print("❌ Failed to create table:", e)


if __name__ == "__main__":
    postre_main()
    create_delay_trips_table()