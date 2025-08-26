
import requests
import json
from google.protobuf.json_format import MessageToJson, MessageToDict

# Import the local protobuf files
import gtfs_realtime_pb2
import tfnsw_extensions_pb2

def fetch_and_parse_tfnsw_data():
    """
    Fetch and parse TfNSW GTFS realtime vehicle position data
    """
    # API Setup
    url = "https://api.transport.nsw.gov.au/v2/gtfs/vehiclepos/sydneytrains"
    headers = {
        "accept": "application/x-google-protobuf",
        "Authorization": "apikey eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJNM25mLVVhcHFoNWFCbDFVcDRqVG81a2kta2E5a1hvWXB1ZGdvdXlEMEJJIiwiaWF0IjoxNzUyNzI4ODY1fQ.4h7_-DZ0R7HO5zwjw078kSD0xICkufzqF9Y3bf1FOWs"
    }
    params = {
        "debug": "true"
    }

    try:
        # Make the request
        print("Fetching data from TfNSW API...")
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        print(f"Response status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'Unknown')}")
        print(f"Content length: {len(response.content)} bytes")
        
        # Parse the protobuf data
        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(response.content)
        
        print(f"Successfully parsed feed with {len(feed.entity)} entities")
        
        # Convert to JSON for easier inspection
        json_dict = MessageToDict(feed)
        
        # Pretty print some basic info
        print("\n=== FEED HEADER ===")
        if hasattr(feed, 'header'):
            print(f"GTFS Realtime Version: {feed.header.gtfs_realtime_version}")
            print(f"Timestamp: {feed.header.timestamp}")
            print(f"Incrementality: {feed.header.incrementality}")
        
        print(f"\n=== ENTITIES ({len(feed.entity)}) ===")
        
        # Show first few entities
        for i, entity in enumerate(feed.entity[:3]):
            print(f"\nEntity {i+1}:")
            print(f"  ID: {entity.id}")
            
            if entity.HasField('vehicle'):
                vehicle = entity.vehicle
                print(f"  Vehicle ID: {vehicle.vehicle.id if vehicle.HasField('vehicle') else 'N/A'}")
                print(f"  Trip ID: {vehicle.trip.trip_id if vehicle.HasField('trip') else 'N/A'}")
                print(f"  Route ID: {vehicle.trip.route_id if vehicle.HasField('trip') else 'N/A'}")
                
                if vehicle.HasField('position'):
                    pos = vehicle.position
                    print(f"  Position: ({pos.latitude:.6f}, {pos.longitude:.6f})")
                    if hasattr(pos, 'bearing') and pos.HasField('bearing'):
                        print(f"  Bearing: {pos.bearing}")
                    if hasattr(pos, 'speed') and pos.HasField('speed'):
                        print(f"  Speed: {pos.speed}")
        
        # Save full data to JSON file
        with open('tfnsw_vehicle_positions.json', 'w') as f:
            json.dump(json_dict, f, indent=2)
        
        print(f"\nFull data saved to 'tfnsw_vehicle_positions.json'")
        
        return json_dict
        
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"Parsing error: {e}")
        print(f"Error type: {type(e).__name__}")
        return None

if __name__ == "__main__":
    data = fetch_and_parse_tfnsw_data()
    if data:
        print("\nScript completed successfully!")
    else:
        print("\nScript failed to parse data.")
