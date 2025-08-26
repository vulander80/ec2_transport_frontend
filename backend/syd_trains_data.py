import requests
import json
import gtfs_realtime_pb2  # Make sure this is installed via gtfs-realtime-bindings
from google.protobuf.json_format import MessageToDict
import data_processor
import auth
import uuid
from datetime import datetime, timezone, timedelta
import postresql_main
import zipfile
import os

def temp_route():
    return_data = []
    set_routeid = 'T3_1a'
    url = "https://api.transport.nsw.gov.au/v2/gtfs/realtime/sydneytrains"

    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": "apikey eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJNM25mLVVhcHFoNWFCbDFVcDRqVG81a2kta2E5a1hvWXB1ZGdvdXlEMEJJIiwiaWF0IjoxNzUyNzI4ODY1fQ.4h7_-DZ0R7HO5zwjw078kSD0xICkufzqF9Y3bf1FOWs"
    }

    response = requests.get(url, headers=headers)
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)
    
    def format_time(ts):
        return datetime.fromtimestamp(ts).strftime("%H:%M:%S") if ts else None

    feed_dict_list = [MessageToDict(entity) for entity in feed.entity]

    count = 0
    for fdl in feed_dict_list:
        
        set_realid = fdl['tripUpdate']['trip']['routeId']
        if set_routeid == set_realid and count == 0:
            count += 1
            set_tripid = fdl['id']
            set_timestamp = fdl['tripUpdate']['timestamp']
            return_data.append(fdl)
            
    return return_data

    
def temp_alert():
    output_data = []
    set_token = auth.get_nswt_token()
    url = "https://api.transport.nsw.gov.au/v2/gtfs/alerts/sydneytrains"
    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": f"apikey {set_token}"
    }
    response = requests.get(url, headers=headers)
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)
    
    def format_time(ts):
        return datetime.fromtimestamp(ts).strftime("%H:%M:%S") if ts else None

    # --- Parse Entities ---
    for entity in feed.entity[0:1]:
        if entity.HasField("alert"):
            alert = entity.alert
            data = {
                "type": "alert",
                "entity_id": entity.id,
                "active_periods": [
                    {
                        "start": p.start if p.HasField("start") else None,
                        "end": p.end if p.HasField("end") else None
                    } for p in alert.active_period
                ],
                "informed_entities": [
                    {
                        "agency_id": ie.agency_id if ie.HasField("agency_id") else None,
                        "route_id": ie.route_id if ie.HasField("route_id") else None
                    } for ie in alert.informed_entity
                ],
                "cause": alert.cause,
                "effect": alert.effect,
                "url": next((t.text for t in alert.url.translation if t.language == "en"), None),
                "header_text": next((t.text for t in alert.header_text.translation if t.language == "en"), None),
                "description_text": next((t.text for t in alert.description_text.translation if t.language in ("en", "en/html")), None),
                "retrieved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            output_data.append(data)
    
    return output_data


def get_sydtrain_alerts():
    final_data = []
    set_token = auth.get_nswt_token()
    # Fetch protobuf data
    url = "https://api.transport.nsw.gov.au/v2/gtfs/alerts/sydneytrains"
    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": f"apikey {set_token}"
    }
    response = requests.get(url, headers=headers)

    # Decode protobuf to FeedMessage
    feed = gtfs_realtime_pb2.FeedMessage()

    feed.ParseFromString(response.content)

    # Convert to JSON string
    json_output = MessageToDict(feed)

    # Optionally load it as a Python dict
    train_data = json.loads(json_output)['entity']
    if train_data:
        for td in train_data:
            start_ts = td['alert']['activePeriod'][0].get('start')
            start_ts = int(start_ts) if start_ts is not None else None
            end_ts = td['alert']['activePeriod'][0].get('end')
            end_ts = int(end_ts) if end_ts is not None else None
            if start_ts:
                start_dt = datetime.fromtimestamp(start_ts, tz=timezone.utc)
                start_dt = start_dt.strftime('%d %B %Y, %H:%M:%SZ')
            else:
                start_dt = None
            
            if end_ts:
                end_dt = datetime.fromtimestamp(end_ts, tz=timezone.utc)
                end_dt.strftime('%d %B %Y, %H:%M:%SZ')
            else:
                end_dt = None
            
            set_cause = td['alert']['cause']
            set_effect = td['alert']['effect']
            set_id = td['id']
            set_sum = td['alert']['headerText']['translation'][0]['text']
            set_desc = td['alert']['descriptionText']['translation'][0]['text']

            final_data.append({
                "id": set_id,
                "start": start_dt,
                "end": end_dt,
                "cause": set_cause,
                "effect": set_effect,
                "summary": set_sum,
                "description": set_desc
            })
        return final_data
    else:
        return None

    #data_processor.output_json('temp-export01',data)

    return set_data

def get_route_info(route_id):
    return None
    
    ''''all_routes = all_route_data()

    final_data = []
    route_data = [{ "route": { "id": "T1", "name": "T1 North Shore & Western Line", "color": "#0072C6", "stations": [ { "name": "Emu Plains", "next": "Penrith", "travelTimeMins": 5, "health": "OK" }, { "name": "Penrith", "next": "Kingswood", "travelTimeMins": 4, "health": "OK" }, { "name": "Kingswood", "next": "St Marys", "travelTimeMins": 4, "health": "OK" }, { "name": "St Marys", "next": "Blacktown", "travelTimeMins": 9, "health": "OK" }, { "name": "Blacktown", "next": "Parramatta", "travelTimeMins": 12, "health": "OK" }, { "name": "Parramatta", "next": "Strathfield", "travelTimeMins": 13, "health": "OK" }, { "name": "Strathfield", "next": "Central", "travelTimeMins": 15, "health": "OK" }, { "name": "Central", "next": "Rhodes", "travelTimeMins": 17, "health": "OK" }, { "name": "Rhodes", "next": "Meadowbank", "travelTimeMins": 3, "health": "OK" }, { "name": "Meadowbank", "next": "West Ryde", "travelTimeMins": 2, "health": "OK" }, { "name": "West Ryde", "next": "Epping", "travelTimeMins": 8, "health": "OK" }, { "name": "Epping", "next": "Hornsby", "travelTimeMins": 18, "health": "OK" }, { "name": "Hornsby", "next": None, "travelTimeMins": None, "health": "OK" } ] } }]

    for rd in route_data:
        set_rid = rd['route']['id']
        if set_rid == route_id:
            final_data.append(rd)
    
    if final_data:
        return final_data
    else:
        set_routename = None
        set_colour = None
        set_stations = None
        for ar in all_routes['routes']:
            a_rname = ar['name']
            a_routeid = ar['id']
            a_rcolour = ar['color']
            a_stations = ar['stops']
            
            if a_routeid == route_id:
                set_routename = a_rname
                set_colour = a_rcolour
                set_stations = a_stations

        return [{ "route": { "id": f"{route_id}", "name": f"{set_routename}", "color": f"{a_rcolour}", "stations": [ { "name": None, "next": None, "travelTimeMins": None, "health": "No Information available" } ] } }]'''

def all_route_data():
    final_data = []
    #set_data = { "routes": [ { "id": "T1", "name": "T1 North Shore & Western Line", "color": "#6F818E", "start_station": "Emu Plains", "end_station": "Hornsby", "stops": [ "Emu Plains", "Penrith", "Kingswood", "St Marys", "Blacktown", "Parramatta", "Central", "Strathfield", "Rhodes", "Meadowbank", "West Ryde", "Epping", "Hornsby" ] }, { "id": "T2", "name": "T2 Inner West & Leppington Line", "color": "#F58220", "start_station": "Leppington", "end_station": "Central", "stops": [ "Leppington", "Liverpool", "Cabramatta", "Strathfield", "Central" ] }, { "id": "T3", "name": "T3 Bankstown Line", "color": "#009245", "start_station": "Bankstown", "end_station": "Liverpool", "stops": [ "Bankstown", "Canterbury", "Lakemba", "Punchbowl", "Liverpool" ] }, { "id": "T4", "name": "T4 Eastern Suburbs & Illawarra Line", "color": "#ED1C24", "start_station": "Cronulla", "end_station": "Bondi Junction", "stops": [ "Cronulla", "Sutherland", "Hurstville", "Central", "Bondi Junction" ] }, { "id": "T8", "name": "T8 Airport & South Line", "color": "#662D91", "start_station": "Macarthur", "end_station": "City Circle", "stops": [ "Macarthur", "Campbelltown", "Airport", "Central", "Town Hall" ] } ] }
    set_data = data_processor.get_json('sydtrain_routes')

    route_code = []
    for sd in set_data:
        set_short = sd['route_short_name']
        route_code.append(set_short)
    
    route_code = list(set(route_code))

    for rc in route_code:
        build_data = []
        set_colour = None
        route_str = None

        for sd in set_data:
            set_short = sd['route_short_name']
            set_routeid = sd['route_id']
            set_long = sd['route_long_name']
            sd_colour = sd['route_color']
            set_agency = sd['agency_id']

            if rc == set_short:
                set_colour = sd_colour
                build_data.append({
                    "route_id": set_routeid,
                    "route_long": set_long,
                    "agencyid": set_agency

                })
                if not route_str:
                    route_str = set_long
                else:
                    route_str = f"{route_str}, {set_long}"
        
        #final_data.append({ "route_short": rc, "route_name": route_str, "route_colour": set_colour, "route_data": build_data })
        final_data.append({ "route_short": rc, "route_name": route_str, "route_colour": set_colour, "route_data": build_data})
    
    data_processor.output_json('sample05',final_data)



    if final_data:
        return final_data
    else:
        return None

def pre_alert_data():
    api_endpoint = 'https://api.transport.nsw.gov.au/v1/tp/'
    api_call = 'add_info'

    # Set the date filter to 24 hours ago
    when = datetime.now() - timedelta(days=1)
    filter_date = when.strftime('%d-%m-%Y')

    # Build query parameters
    params = {
        'outputFormat': 'rapidJSON',
        'coordOutputFormat': 'EPSG:4326',
        'filterDateValid': filter_date,
        'filterPublicationStatus': 'current'
    }

    # API key should be added to headers if required
    headers = {
        "Authorization": f"apikey {auth.get_nswt_token()}",
        'Accept': 'application/json'
    }

    # Build final URL
    url = f'{api_endpoint}{api_call}'

    # Make the GET request
    response = requests.get(url, headers=headers, params=params)
    print(response.status_code)
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        return None

def format_friendly_date(date_str):
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
        day = dt.day
        suffix = 'th' if 11 <= day <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
        return f"{day}{suffix} {dt.strftime('%B %Y')}"
    except Exception:
        return date_str

def simplify_alert(data):
    validity_period = data.get("timestamps", {}).get("validity", [{}])[0]

    # Deduplicate stops by (id, name, locality)
    seen_stops = set()
    unique_stops = []
    for stop in data.get("affected", {}).get("stops", []):
        stop_key = (
            stop.get("id"),
            stop.get("name"),
            stop.get("parent", {}).get("name")
        )
        if stop_key not in seen_stops:
            seen_stops.add(stop_key)
            unique_stops.append({
                "id": stop.get("id"),
                "name": stop.get("name"),
                "locality": stop.get("parent", {}).get("name")
            })

    # Deduplicate line descriptions
    line_descriptions = list({
        line.get("description")
        for line in data.get("affected", {}).get("lines", [])
        if line.get("description")
    })

    return {
        "id": data.get("id"),
        "type": data.get("type"),
        "title": data.get("subtitle"),
        "url": data.get("url"),
        "validity": {
            "from": format_friendly_date(validity_period.get("from")),
            "to": format_friendly_date(validity_period.get("to"))
        },
        "expiration": format_friendly_date(data.get("timestamps", {}).get("expiration")),
        "priority": data.get("priority"),
        "announcement_type": data.get("properties", {}).get("announcementType"),
        "speech_text": data.get("properties", {}).get("speechText"),
        "affected_stops": unique_stops,
        "affected_lines": line_descriptions
    }
    
def all_alert_data():
    data = pre_alert_data()
    #data = get_all_alerts()
    final_data = []
    alert_data = data['infos']['current']
    print(f'lenght: {len(alert_data)}')
    for alert in alert_data:
       simple_data = simplify_alert(alert)
       final_data.append(simple_data)

    
    if final_data:
       return final_data

def sample_gtfs():

    url = "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains"
    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": f"apikey {auth.get_nswt_token()}"
    }
    params = {"debug": "true"}

    response = requests.get(url, headers=headers, params=params)

    if response.status_code == 200:
        feed = gtfs_realtime_pb2.FeedMessage()
        try:
            feed.ParseFromString(response.content)

            # Convert protobuf to JSON (as a string)
            json_string = MessageToDict(feed)

            # Optional: convert JSON string to dict for easier Python manipulation
            json_data = json.loads(json_string)
            data_processor.output_json('sample06',json_data)
            # Example: print vehicle IDs and positions
            '''for entity in json_data.get("entity", []):
                vehicle = entity.get("vehicle", {})
                trip_id = vehicle.get("trip", {}).get("tripId")
                position = vehicle.get("position", {})
                print(f"Trip ID: {trip_id}, Position: {position}")'''

        except Exception as e:
            print(f"Error parsing protobuf: {e}")
    else:
        print(f"Request failed with status code: {response.status_code}")
        print(response.text)

def get_sydneytrains():
    url = "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains"
    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": f"apikey {auth.get_nswt_token()}"
    }

    # --- Fetch Real-Time Trip Updates ---
    response = requests.get(url, headers=headers)
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)
    output_data = []

    def format_time(ts):
        return datetime.fromtimestamp(ts).strftime("%H:%M:%S") if ts else None

    # --- Parse Entities ---
    for entity in feed.entity:
        if entity.HasField("vehicle"):
            vehicle_data = entity.vehicle
            trip = vehicle_data.trip
            position = vehicle_data.position
            vehicle_info = vehicle_data.vehicle
            valid_route = True
            
            if trip.route_id == "RTTA_REV" or trip.route_id == "RTTA_DEF" or not trip.route_id:
                valid_route = False
            
            if valid_route:
                data = {
                    "db_id": str(uuid.uuid4()),
                    "entity_id": entity.id,
                    "trip_id": trip.trip_id if trip.HasField("trip_id") else None,
                    "route_id": trip.route_id if trip.HasField("route_id") else None,
                    "schedule_relationship": trip.schedule_relationship,
                    "latitude": position.latitude if position.HasField("latitude") else None,
                    "longitude": position.longitude if position.HasField("longitude") else None,
                    "vehicle_id": vehicle_info.id if vehicle_info.HasField("id") else None,
                    "label": vehicle_info.label if vehicle_info.HasField("label") else None,
                    "retrieved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # Local time
                }


                output_data.append(data)
    
    data_processor.output_json('temp_output01',output_data)
    return output_data

def get_complete():


    url = "https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs"
    headers = {
        "accept": "application/octet-stream",
        "Authorization": f"apikey {auth.get_nswt_token()}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        with open("gtfs_feed.zip", "wb") as f:
            f.write(response.content)
        print("GTFS data downloaded successfully.")
    else:
        print(f"Failed to download GTFS data: {response.status_code} - {response.text}")

def get_alldata():
    url = "https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains"
    headers = {
        "accept": "application/octet-stream",
        "Authorization": f"apikey {auth.get_nswt_token()}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        zip_filename = "gtfs_feed_sydtrains.zip"
        extract_folder = "gtfs_feed_sydtrains"

        # Save the zip file
        with open(zip_filename, "wb") as f:
            f.write(response.content)
        print("GTFS data downloaded successfully.")

        # Create extract_folder if not exists
        if not os.path.exists(extract_folder):
            os.makedirs(extract_folder)

        # Unzip into the folder
        with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
            zip_ref.extractall(extract_folder)
        print(f"Extracted to folder: {extract_folder}")

    else:
        print(f"Failed to download GTFS data: {response.status_code} - {response.text}")

def get_alldata_old():
    url = "https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains"
    headers = {
        "accept": "application/octet-stream",
        "Authorization": f"apikey {auth.get_nswt_token()}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        with open("gtfs_feed_sydtrains.zip", "wb") as f:
            f.write(response.content)
        print("GTFS data downloaded successfully.")
    else:
        print(f"Failed to download GTFS data: {response.status_code} - {response.text}")

def upload_vehpos():
    get_data = get_sydneytrains()
    postresql_main.add_payload(get_data)

if __name__ == "__main__":
   #upload_vehpos()
   get_sydneytrains()

   