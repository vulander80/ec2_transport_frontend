import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime, time
import json
from math import radians, sin, cos, atan2, sqrt
import datetime as dt
import math
import data_processor
import syd_trains_data
from collections import defaultdict
import psycopg2.extras
from zoneinfo import ZoneInfo

sydney_now = datetime.now(ZoneInfo("Australia/Sydney"))

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

        print("Columns in vehicle_position:")
        for col_name, data_type in columns:
            print(f"- {col_name} ({data_type})")

        cur.close()
        conn.close()

    except Exception as e:
        print("❌ Failed to fetch columns:", e)

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


def get_maindata():
    url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = """
        SELECT 
            ct.*,
            sr.route_short_name,
            sr.route_long_name,
            sr.route_color
        FROM current_trains ct
        JOIN station_routes sr 
            ON TRIM(LOWER(ct.route_id)) = TRIM(LOWER(sr.route_id))
        WHERE ct.retrieved_at > NOW() - INTERVAL '5 minute'
        AND sr.route_short_name LIKE 'T%'
        ORDER BY sr.route_short_name, ct.trip_id, ct.retrieved_at DESC;
        """
        cur.execute(query)

        # Get field names
        colnames = [desc.name for desc in cur.description]

        # Fetch and convert rows to dicts
        results = [dict(zip(colnames, row)) for row in cur.fetchall()]

        cur.close()
        conn.close()

        return results

    except Exception as e:
        print("❌ Failed:", e)
        return []
    
def get_maindata_delay():
    url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = """
        SELECT 
            ct.*,
            sr.route_short_name,
            sr.route_long_name,
            sr.route_color
        FROM current_trains ct
        JOIN station_routes sr 
            ON TRIM(LOWER(ct.route_id)) = TRIM(LOWER(sr.route_id))
        WHERE ct.retrieved_at > NOW() - INTERVAL '5 minute'
        AND sr.route_short_name LIKE 'T%'
        ORDER BY sr.route_short_name, ct.trip_id, ct.retrieved_at DESC;
        """
        cur.execute(query)

        # Get field names
        colnames = [desc.name for desc in cur.description]

        # Fetch and convert rows to dicts
        results = [dict(zip(colnames, row)) for row in cur.fetchall()]

        cur.close()
        conn.close()

        return results

    except Exception as e:
        print("❌ Failed")

def get_tripdata(tripid):
    url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = f"""
        SELECT 
            ct.*,
            sr.route_short_name,
            sr.route_long_name
        FROM current_trains ct
        JOIN station_routes sr
            ON LOWER(TRIM(ct.route_id)) = LOWER(TRIM(sr.route_id))
        WHERE ct.retrieved_at > NOW() - INTERVAL '5 minute'
        AND ct.trip_id = '{tripid}'
        ORDER BY ct.trip_id, ct.retrieved_at DESC;
        """
        cur.execute(query)

        # Fetch results
        results = cur.fetchall()

        cur.close()
        conn.close()

        return json.dumps(results, default=str)

    except Exception as e:
        print("❌ Failed")

def _row_to_legacy(sd: dict):
    # old index map reference
    # 0:id, 1:route_short?, 2:trip_id, 3:route_id, 4:delay_sec,
    # 5:lat, 6:lon, 7:stop_seq, 8:trip_name, 9:retrieved_at,
    # 10:route_short_name, 11:route_long_name, 12:route_color
    return [
        sd.get("id"),
        sd.get("route_short"),             # keep None if not present in ct
        sd.get("trip_id"),
        sd.get("route_id"),
        sd.get("delay_sec"),
        sd.get("lat"),
        sd.get("lon"),
        sd.get("stop_seq"),
        sd.get("trip_name"),
        sd.get("retrieved_at"),
        sd.get("route_short_name"),
        sd.get("route_long_name"),
        sd.get("route_color"),
    ]

def _iso_to_dt(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v)  # e.g. "2025-08-15T05:23:50"
        except ValueError:
            return datetime.min
    return datetime.min

def get_5min():
    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    query = f"""
    SELECT *
    FROM current_trains
    WHERE retrieved_at > NOW() - INTERVAL '5 minutes'
    ORDER BY retrieved_at DESC;
    """
    cur.execute(query)

    result = cur.fetchone()  # Fetch a single row since LIMIT 1
    cur.close()
    conn.close()



    '''if result:
        more_than_one_minute = result[2]  # Third column
        return more_than_one_minute
    else:
        return None'''

def get_time_diff2(start_time):
    start_time_obj = datetime.strptime(start_time, "%H:%M").time()
    start_dt = datetime.combine(sydney_now.date(), start_time_obj, tzinfo=ZoneInfo("Australia/Sydney"))
    time_diff = sydney_now - start_dt
    return time_diff 

def get_startime_diff(start_time: str):
    # Current Sydney datetime
    sydney_now = datetime.now(ZoneInfo("Australia/Sydney"))
    
    # Parse the HH:MM string into a datetime today in Sydney
    start_time_obj = datetime.strptime(start_time, "%H:%M").time()
    start_dt = datetime.combine(sydney_now.date(), start_time_obj, tzinfo=ZoneInfo("Australia/Sydney"))
    
    # Calculate difference
    time_diff = sydney_now - start_dt
    
    # Check if trip already started
    trip_started = sydney_now >= start_dt
    
    return time_diff, trip_started

def get_endtime_diff(end_time: str):
    # Current Sydney datetime
    sydney_now = datetime.now(ZoneInfo("Australia/Sydney"))
    
    # Parse the HH:MM string into a datetime today in Sydney
    #end_time_obj = datetime.strptime(str(end_time), "%H:%M").time()
    
    end_dt = datetime.combine(sydney_now.date(), end_time, tzinfo=ZoneInfo("Australia/Sydney"))

    # Calculate difference
    time_diff = sydney_now - end_dt
    
    # Check if trip already started
    trip_ended = sydney_now >= end_dt
    
    return trip_ended

def process_data(data):

    #set_pastdata = get_5min()
    #data_processor.output_json('temp_process01',data)
    # collect unique trip_ids in original order
    #trip_list = list(dict.fromkeys([item[2] for item in data]))
    trip_list = list(dict.fromkeys([item["trip_id"] for item in data]))

    collate_list = []
    delay_list = []
    train_delay_count = 0
    for tlist in trip_list:
    # rows for this trip_id
        build_data_raw = []
        count = 0
        process_trip = True
        start_time = None
        start_label = None
        route_name = None
        output_lat = None
        output_long = None
        active = True
        set_first = True
        for sd in data:
            s_tripid = sd['trip_id']
            s_label = sd['label']
            if tlist == s_tripid:
                count += 1
                #build_data_raw.append({ "lat": sd['latitude'], "long": sd['longitude'], "time": sd['retrieved_at'] })
                build_data_raw.append(sd)
                start_label = s_label.split(' ')[0]
                if set_first:
                    route_name = sd['route_long_name']
                    output_lat = sd['latitude']
                    output_long = sd['longitude']
                    set_first = False



        
        
        if build_data_raw:
            sorted_data = sorted(build_data_raw, key=lambda r: r['retrieved_at'])
            total_km, avg_kmh = distance_and_avg_speed(sorted_data)
            if avg_kmh == 0:
                #depot = check_finaldestination2(tlist)
                #data_processor.output_json('temp_depot02',depot)
                time_diff, trip_started = get_startime_diff(start_label)
                print(tlist,trip_started)
                if not trip_started:
                    process_trip = False
                    active = False
                else:
                    
                    trip_ended, end_time, valid_trip = check_finaldestination2(tlist)
                    print(f"{tlist} - trip_ended: {trip_ended}, end time: {end_time}")

                    if not valid_trip:
                        process_trip = False
                        active = False

                    if trip_ended:
                        
                        process_trip = False
                        active = False
                
                if process_trip:
                    train_delay_count += 1
                    delay_list.append({
                        "tripid": tlist,
                        "routename": route_name,
                        "trip_start": start_label,
                        "trip_end": end_time,
                        "active": active,
                        "gmap_url": f"https://www.google.com/maps?q={output_lat},{output_long}",
                        "time_idle": 1
                    })
                    print(f"trip: {route_name} ({tlist}), Start: {start_label}, End: {end_time}, active: {active} - map: https://www.google.com/maps?q={output_lat},{output_long}")

            processed = set()

            for bdr in build_data_raw:
                if tlist in processed:
                    continue  # skip duplicates
                set_lat = bdr['latitude']
                set_long = bdr['longitude']
                google_maps_url = f"https://www.google.com/maps?q={set_lat},{set_long}"
                processed.add(tlist)
            #print(tlist,total_km,avg_kmh)


        if process_trip:
            collate_list.append({
                "trip_id": tlist,
                "total_km": round(total_km, 3) if total_km is not None else 0.0,
                "avg_kmh": round(avg_kmh, 2) if avg_kmh == avg_kmh else 0.0,
                "gps_url": google_maps_url if google_maps_url is not None else None,
            })
    print(f"train delay count: {train_delay_count}")
    data_processor.output_json('temp_travel02',collate_list)
    return collate_list, delay_list

def process_data2(data):
    
    trip_list = []
    for item in data:
        trip_list.append(item[2])
        set_long = item
    
    trip_list = list(dict.fromkeys(trip_list))

    collate_list = []
    
    for tlist in trip_list:
        # collect all rows for this trip_id
        build_data = [item for item in data if item[2] == tlist]
        set_long = None
        set_lat = None
        set_route = None
        long_route = None

        for item in data:
            #print(item)
            if item[2] == tlist:
                build_data.append(item)
                set_long = item[6]  # longitude
                set_lat = item[5]   # latitude
                set_route = item[3]
                long_route = item[8]

        if not build_data:
            continue  # or append with zeros
        

        if tlist == '160C.1294.172.64.A.8.86209992':
            total_km, avg_kmh = distance_and_avg_speed(build_data)
            print(total_km,avg_kmh)

        '''collate_list.append({
            "trip_id": tlist,
            "total_km": round(total_km, 3),
            "avg_kmh": round(avg_kmh, 2),
            "last_long": set_long,
            "last_lat": set_lat,
            "route": set_route,
            "long_route": long_route
        })
    

    station_stops = [
        {"long":'150.7528076171875',"lat": '-33.59882736206055', "depot_name": 'Leppington Depot'},

        ]

    final_list = []

    stuck_count = 0
    for cl in collate_list:
        valid_depot = False
        depot = False
        set_route = cl['route']
        if cl['total_km'] == 0:
            depot = check_finaldestination2(cl)

        if not depot and cl['total_km'] == 0:
            stuck_count +=1
            #print(cl)
        
        if set_route == "NTH_2a":
        
            print(cl)'''
    
    return collate_list

def check_finaldestination(input_trip):
    set_tripid = input_trip['trip_id']
    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    query = f"""
    SELECT 
        trip_id,
        arrival_time,
        CASE 
            WHEN EXTRACT(EPOCH FROM (arrival_time::time - CURRENT_TIME::time)) / 60 > 1 THEN TRUE
            ELSE FALSE
        END AS more_than_one_minute
    FROM stop_times
    WHERE trip_id = '{set_tripid}'
    ORDER BY stop_sequence DESC
    LIMIT 1;
    """
    cur.execute(query)

    result = cur.fetchone()  # Fetch a single row since LIMIT 1
    cur.close()
    conn.close()

    if result:
        more_than_one_minute = result[2]  # Third column
        return more_than_one_minute
    else:
        return None



def check_finaldestination2(input_trip):
    print(f"checking {input_trip}")

    valid_trip = True

    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    query = f"""
    SELECT *
    FROM stop_times
    WHERE trip_id = '{input_trip}'
    ORDER BY stop_sequence DESC
    LIMIT 1;
    """
    cur.execute(query)
    colnames = [desc.name for desc in cur.description]
    result = [dict(zip(colnames, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()

    is_start = False
    is_end = False

    try:
        last_stop = result[-1]['arrival_time']
        trip_ended = get_endtime_diff(last_stop)
    except:
        valid_trip = False
        trip_ended = True
    


    
    

    return trip_ended, last_stop, valid_trip
    '''dep_datetime = datetime.combine(date.today(), dep_time)
    now = datetime.now()
    time_diff = dep_datetime - now
    print("Time difference:", time_diff)
    last_stop = result[-1]['arrival_time']
    
    print(f)


    if result:
        return result
    else:
        return None'''

def distance_and_avg_speed(rows):
    # Sort rows by timestamp
    sorted_rows = sorted(rows, key=lambda r: r['retrieved_at'])

    total_km = 0.0
    start_time = sorted_rows[0]['retrieved_at']
    end_time = sorted_rows[-1]['retrieved_at']

    for i in range(1, len(sorted_rows)):
        prev = sorted_rows[i - 1]
        curr = sorted_rows[i]
        if prev['latitude'] is not None and prev['longitude'] is not None \
           and curr['latitude'] is not None and curr['longitude'] is not None:
            total_km += haversine(prev['latitude'], prev['longitude'],
                                  curr['latitude'], curr['longitude'])

    elapsed_hours = (end_time - start_time).total_seconds() / 3600
    avg_kmh = total_km / elapsed_hours if elapsed_hours > 0 else 0

    return round(total_km, 3), round(avg_kmh, 2)

def haversine(lat1, lon1, lat2, lon2):
    """Return distance in kilometers between two lat/lon points."""
    R = 6371.0  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

def haversine_distance(lat1, lon1, lat2, lon2):

    # Convert all to float
    lat1 = float(lat1)
    lon1 = float(lon1)
    lat2 = float(lat2)
    lon2 = float(lon2)

    # Radius of Earth in metres
    R = 6371000  

    # Convert lat/lon from degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) ** 2

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c  # Distance in metres

def _to_dt(t):
    if isinstance(t, dt.datetime):
        return t
    # handle ISO strings incl. trailing 'Z'
    if isinstance(t, str):
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        return dt.datetime.fromisoformat(t)
    raise TypeError(f"Unsupported timestamp type: {type(t)}")

def syd_jsondata(set_data,travel_data):
    """
    Shape:
    [
      {
        "route_name": "T1",
        "route_colour": "F99D1C",
        "trip_data": [
          {
            "route_id": "NSN_2a",
            "route_name": "Berowra and Hornsby to City via Gordon",
            "train_data": [{"trip_id": "108E.1294.172.124.T.8.86213095"}, ...]
          },
          ...
        ]
      },
      ...
    ]
    """
    output = {}

    # Optional: known column order if rows ever come in as tuples/lists
    COLS = [
        "id",              # 0
        "route_short",     # 1  (if present in ct)
        "trip_id",         # 2
        "route_id",        # 3
        "delay_sec",       # 4
        "lat",             # 5
        "lon",             # 6
        "stop_seq",        # 7
        "trip_name",       # 8
        "retrieved_at",    # 9
        "route_short_name",# 10 (from sr)
        "route_long_name", # 11 (from sr)
        "route_color",     # 12 (from sr)
    ]

    count = 0
    processed = set()

    #data_processor.output_json('temp_setdata01',set_data)
    for sd in set_data:
        # skip duplicates

        if isinstance(sd, dict):
            main_route   = sd.get("route_short_name")  # e.g. "T1"
            route_id     = sd.get("route_id")          # e.g. "NSN_2a"
            trip_id      = sd.get("trip_id")
            route_colour = sd.get("route_color")
            route_name   = sd.get("route_long_name")        

        else:
            # Fallback for legacy list/tuple rows
            main_route   = sd[10] if len(sd) > 10 else None
            route_id     = sd[3]  if len(sd) > 3  else None
            trip_id      = sd[2]  if len(sd) > 2  else None
            route_colour = sd[12] if len(sd) > 12 else None
            route_name   = sd[11] if len(sd) > 11 else None

        if trip_id in processed:
            continue  

        # Skip incomplete rows
        if not (main_route and route_id and trip_id):
            continue

        # Ensure main route exists
        bucket = output.setdefault(
            main_route,
            {"route_name": main_route, "route_colour": route_colour, "trip_data": {}},
        )

        # Ensure route_id exists
        route_bucket = bucket["trip_data"].setdefault(
            route_id,
            {"route_id": route_id, "route_name": route_name, "train_data": []},
        )

        # Append trip_id (dedupe optional)
        set_avgspeed = None
        gps_url = None
        for td in travel_data:
            td_tripid = td['trip_id']
            if trip_id == td_tripid:
                set_avgspeed = td['avg_kmh']
                gps_url = td['gps_url']

        route_bucket["train_data"].append({"trip_id": trip_id, "avg_speed": set_avgspeed, "gps_url": {gps_url}})
        processed.add(trip_id)

    # Flatten trip_data dicts to lists
    result = []
    for mr, bucket in output.items():
        result.append({
            "route_name": bucket["route_name"],
            "route_colour": bucket["route_colour"],
            "trip_data": list(bucket["trip_data"].values()),
        })

    return result


def syd_jsondata2(set_data):
    output = {}
    
    for sd in set_data:
        main_route = sd[10]       # e.g. "T1"
        route_id = sd[3]          # e.g. "NSN_1a"
        trip_id = sd[2]
        route_colour = sd[12]
        route_name = sd[11]
        
        # Ensure main route exists
        if main_route not in output:
            output[main_route] = {
                "route_name": main_route,
                "route_colour": route_colour,
                "trip_data": {}
            }
        
        # Ensure route_id exists
        if route_id not in output[main_route]["trip_data"]:
            output[main_route]["trip_data"][route_id] = {
                "route_id": route_id,
                "route_name": route_name,
                "train_data": []
            }
        
        # Append trip_id
        output[main_route]["trip_data"][route_id]["train_data"].append({"trip_id": trip_id})
    
    # Flatten trip_data dict to list
    result = list(output.values())
    for r in result:
        r["trip_data"] = list(r["trip_data"].values())
    
    return list(output.values()) 


def sql_main():
    set_data = get_maindata()
    travel_data = process_data(set_data)

    if set_data:
        return_data = syd_jsondata(set_data,travel_data)
        #data_processor.output_json('delay_250819_traveldata',travel_data)
        return return_data

def insert_delay_trips(payload):
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("❌ DATABASE_URL not set in environment.")
        exit()

    import psycopg2
    from datetime import datetime

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        insert_query = """
            INSERT INTO delay_trips
                (tripid, routename, trip_start, trip_end, active, gmap_url, time_idle, train_idle)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tripid) DO UPDATE SET
                routename  = EXCLUDED.routename,
                trip_start = EXCLUDED.trip_start,
                trip_end   = EXCLUDED.trip_end,
                active     = EXCLUDED.active,
                gmap_url   = EXCLUDED.gmap_url,
                time_idle  = EXCLUDED.time_idle,
                train_idle = EXCLUDED.train_idle;   -- 👈 will now correctly overwrite
        """

        for trip in payload:
            # Ensure trip_start is a time object
            trip_start_obj = trip['trip_start']
            if isinstance(trip_start_obj, str):
                trip_start_obj = datetime.strptime(trip_start_obj, "%H:%M").time()

            # Ensure trip_end is a time object
            trip_end_obj = trip['trip_end']
            if isinstance(trip_end_obj, str):
                trip_end_obj = datetime.strptime(trip_end_obj, "%H:%M").time()

            cur.execute(insert_query, (
                trip['tripid'],
                trip['routename'],
                trip_start_obj,
                trip_end_obj,
                trip['active'],
                trip['gmap_url'],
                trip['time_idle'],
                trip['train_idle']   # 👈 use the payload’s value instead of recalculating
            ))

        # Optional: Clean up rows where train_idle = FALSE
        cur.execute("DELETE FROM delay_trips WHERE train_idle = FALSE;")

        conn.commit()
        print("✅ Data inserted/updated and cleaned successfully into delay_trips")

        cur.close()
        conn.close()
    except Exception as e:
        print("❌ Failed to insert data:", e)
        
def insert_delay_trips2(payload):
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("❌ DATABASE_URL not set in environment.")
        return

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        insert_query = """
            INSERT INTO delay_trips
                (tripid, routename, trip_start, trip_end, active, gmap_url, time_idle, train_idle)
            VALUES
                (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (tripid) DO UPDATE SET
                routename  = EXCLUDED.routename,
                trip_start = EXCLUDED.trip_start,
                trip_end   = EXCLUDED.trip_end,
                active     = EXCLUDED.active,
                gmap_url   = EXCLUDED.gmap_url,
                train_idle = EXCLUDED.train_idle;
        """

        for trip in payload:
            from datetime import datetime

            # trip_start comes as "HH:MM" string → convert to time
            if isinstance(trip['trip_start'], str):
                trip_start_obj = datetime.strptime(trip['trip_start'], "%H:%M").time()
            else:
                trip_start_obj = trip['trip_start']

            cur.execute(insert_query, (
                trip['tripid'],
                trip['routename'],
                trip_start_obj,
                trip['trip_end'],
                trip['active'],
                trip['gmap_url'],
                trip['time_idle'],
                True if trip['time_idle'] > 0 else False
            ))

        conn.commit()
        print("✅ Data inserted successfully into delay_trips")

        cur.close()
        conn.close()
    except Exception as e:
        print("❌ Failed to insert data:", e)

def delete_delay(data):
    
    url = os.environ.get("DATABASE_URL")
    conn = psycopg2.connect(url)
    cur = conn.cursor()

    for sd in data:
        set_tripid = sd['tripid']
        set_trainidle = sd['train_idle']
        set_time = sd['time_idle']
        set_gmap = sd['gmap_url']

        if not set_trainidle:
            # delete the row if train_idle is False
            cur.execute(
                "DELETE FROM delay_trips WHERE tripid = %s;",
                (set_tripid,)
            )
        else:
            # update and increment time_idle if train_idle is True
            print(f"trip {set_tripid} timeidle is {set_time} - gmap: {set_gmap}")
            cur.execute(
                """
                UPDATE delay_trips
                SET time_idle = %s
                WHERE tripid = %s;
                """,
                (set_time,set_tripid)
            )


    conn.commit()   # <--- commit changes
    cur.close()
    conn.close()

def process_delay(data):
    url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        query = """
            SELECT *
            FROM delay_trips;
        """
        cur.execute(query)

        # Get field names
        colnames = [desc.name for desc in cur.description]

        # Fetch and convert rows to dicts
        results = [dict(zip(colnames, row)) for row in cur.fetchall()]


        cur.close()
        conn.close()

    except Exception as e:
        print("❌ Failed")
    
    
    current_data = []
    output_data = []

    for rd in results:
        rd_tripid = rd['tripid']

        new_idle = False
        current_idletime = rd['time_idle']
        processed = set()
        for sd in data:
            sd_tripid = sd['tripid']
            if sd_tripid in processed:
                continue
            if rd_tripid == sd_tripid:

                if current_idletime != 1:
                    new_idletime = current_idletime + 1
                else:
                    new_idletime = 1
                processed.add(rd_tripid)
                new_idle = True
                #print(f'{rd_tripid} change from {current_idletime} > {new_idletime}')
                rd["time_idle"] = new_idletime
        
        rd["train_idle"] = new_idle
        output_data.append(rd)
    
    #data_processor.output_json('temp_update01',output_data)
    return output_data

def sql_delayupdate():
    sydney_now = datetime.now(ZoneInfo("Australia/Sydney")).time()
    set_data = get_maindata_delay()
    travel_data, delay_list = process_data(set_data)
    #data_processor.output_json(f'temp_delay_{sydney_now}',delay_list)
    insert_delay_trips2(delay_list)
    delay_list = process_delay(delay_list)
    delete_delay(delay_list)
    

    
    
def print_results(data):
    for input_data in data[0:1]:
        set_route = input_data['route_name']
        set_td = input_data['trip_data']
        for std in set_td:
            po_list = []
            set_rid = std['route_id']
            set_rname = std['route_name']
        print(input_data)

if __name__ == "__main__":
    sql_delayupdate()
    
    