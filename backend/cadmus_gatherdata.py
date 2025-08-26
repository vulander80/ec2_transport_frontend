import syd_trains_data
import data_processor
import os
import psycopg2
import json
import distance_calc
import time
import pytz
from datetime import datetime

sydney_tz = pytz.timezone('Australia/Sydney')
now_sydney = datetime.now(sydney_tz)
hour = now_sydney.hour

def should_execute_sydney_time():
    sydney_tz = pytz.timezone('Australia/Sydney')
    now_sydney = datetime.now(sydney_tz)
    hour = now_sydney.hour
    # Execute if hour is 4 or later, or before 1 (00:00 to 00:59)
    return hour >= 4 or hour < 1

def create_sample():
    current_data = syd_trains_data.get_sydneytrains()
    data_processor.output_json('sample01',current_data)

def get_all_postresql(query):
    url = os.environ.get("DATABASE_URL")

    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        cur.execute(query)
        rows = cur.fetchall()
        colnames = [desc[0] for desc in cur.description]

        data = [dict(zip(colnames, row)) for row in rows]

        cur.close()
        conn.close()

        return data

    except Exception as e:
        print("❌ Failed to fetch records:", e)
        return []

def output_json(filename, input_data):
    try:
        with open(f"{filename}.json", "w") as json_file:
            json.dump(input_data, json_file, indent=4, default=str)
        print(f"✅ JSON saved to {filename}.json")
    except Exception as e:
        print("❌ Failed to write JSON:", e)

def sample_heatmap():
    #sample_data = data_processor.get_json('sample02')
    if should_execute_sydney_time():
        syd_trains_data.upload_vehpos()
        time.sleep(3)
        current_data = syd_trains_data.get_sydneytrains()
        output_json('script_currentdata',current_data)
        db_data = get_all_postresql("SELECT * FROM veh_pos4")
        output_json('script_dbdata',db_data)

        for cd in current_data:
            cd_tripid = cd['trip_id']
            cd_routeid = cd['route_id']
            if cd_routeid == "NTH_1a":
                build_list = []
                for db in db_data:
                    db_tripid = db['trip_id']
                    if cd_tripid == db_tripid:
                        db['routeid'] = cd_routeid
                        build_list.append(db)
                
                if len(build_list) > 2:
                    output_json('script_builddata',build_list)
                    set_results = distance_calc.distance_process2(cd_tripid,build_list,cd_routeid)
    else:
        print('outside schedule time. not running')

    '''trip_list = []
    for sample in sample_data:
        set_tripid = sample['trip_id']
        trip_list.append(set_tripid)
    
    trip_list = list(set(trip_list))
    print(len(trip_list))
    for tlist in trip_list[0:10]:
        
        for db in db_data:
            set_tripid = db['trip_id']
            if tlist == set_tripid:
                build_list.append(sample)
        
        if len(build_list) > 1:
            
            print(set_results)'''
        
            




if __name__ == "__main__":
    sample_heatmap()

