import requests
import os

def get_nswt_token():
    nswt_token = os.getenv('nswt_token')
    if nswt_token:
        return nswt_token
    else:
        return None
    
