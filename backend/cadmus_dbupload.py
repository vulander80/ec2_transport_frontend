import os
import shutil
from datetime import datetime, timedelta
from syd_trains_data import get_alldata
from postresql_createtables import postre_main

def updatedb_main():
    folder_path = "gtfs_feed_sydtrains"
    zip_file = "gtfs_feed_sydtrains.zip"
    process_data = False

    if os.path.exists(folder_path):
        folder_mtime = os.path.getmtime(folder_path)
        folder_mtime_dt = datetime.fromtimestamp(folder_mtime)

        if datetime.now() - folder_mtime_dt > timedelta(hours=23):
            print(f"Folder is older than 23 hours. Deleting {folder_path} and {zip_file}...")

            # Delete folder
            shutil.rmtree(folder_path)

            # Delete zip file if it exists
            if os.path.exists(zip_file):
                os.remove(zip_file)
            else:
                print(f"{zip_file} does not exist.")

            print("Folder deleted.")
            process_data = True
        else:
            print("Folder is less than 23 hours old. No action taken.")
    else:
        print("Folder does not exist.")
        process_data = True

    if process_data:
        get_alldata()
        postre_main()
