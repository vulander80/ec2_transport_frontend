import time, traceback, threading
from datetime import datetime
from zoneinfo import ZoneInfo
from postresql_createtables import current_trains_import
from postresql_main import sql_delayupdate
import cadmus_dbupload

_lock = threading.Lock()

def job():
    cadmus_dbupload.updatedb_main()
    # prevent overlap if a run takes > 1 minute
    
    if not _lock.acquire(blocking=False):
        print("Previous run still in progress; skipping this minute.", flush=True)
        return
    try:
        sydney_now = datetime.now(ZoneInfo("Australia/Sydney"))
        print(f"\n--- Job started at {sydney_now.strftime('%Y-%m-%d %H:%M:%S %Z')} ---", flush=True)

        current_trains_import()

        sydney_now_end = datetime.now(ZoneInfo("Australia/Sydney"))
        print(f"--- Job finished at {sydney_now_end.strftime('%Y-%m-%d %H:%M:%S %Z')} ---\n", flush=True)

    except Exception:
        traceback.print_exc()
    finally:
        _lock.release()
    
    sql_delayupdate()

if __name__ == "__main__":
    import schedule  # pip install schedule
    schedule.every(1).minutes.do(job)
    job()  # optional: run once immediately
    
    while True:
        schedule.run_pending()
        time.sleep(1)
