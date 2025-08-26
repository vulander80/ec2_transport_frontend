from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import syd_trains_data
import postresql_main
import data_processor
import os
import pty
import uvicorn
import asyncio
import select
from typing import List

app = FastAPI()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or restrict to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Terminal WebSocket ----------
@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    if origin not in allowed_origins:
        await websocket.close(code=1008)  # Policy violation
        print(f"connection rejected (403 Forbidden) from {origin}")
        return

    await websocket.accept()
    print(f"WebSocket accepted from {origin}")

    pid, fd = pty.fork()

    if pid == 0:
        os.execvp("/bin/bash", ["/bin/bash"])

    async def read_from_fd():
        while True:
            await asyncio.sleep(0.01)
            if select.select([fd], [], [], 0)[0]:
                try:
                    output = os.read(fd, 1024).decode(errors="ignore")
                    await websocket.send_text(output)
                except Exception:
                    break

    async def write_to_fd():
        while True:
            try:
                data = await websocket.receive_text()
                os.write(fd, data.encode())
            except WebSocketDisconnect:
                break
            except Exception:
                break

    await asyncio.gather(read_from_fd(), write_to_fd())

# ---------- Asset Endpoint ----------
@app.get("/assets")
async def get_assets():
    return [
        {
            "id": 1,
            "name": "Server-001",
            "type": "Hardware",
            "status": "Active",
            "lastUpdated": "2024-01-15T10:30:00Z",
        },
        {
            "id": 2,
            "name": "License-Office365",
            "type": "Software",
            "status": "Active",
            "lastUpdated": "2024-01-14T14:20:00Z",
        },
    ]

# ---------- Train Alerts ----------
@app.get("/api/trains")
def get_trains():
    set_data = syd_trains_data.get_all_alerts()
    return set_data

# ---------- File Browser ----------
def get_folder_structure(path, base_path):
    structure = {
        "name": os.path.basename(path),
        "type": "folder" if os.path.isdir(path) else "file",
        "path": os.path.relpath(path, base_path).replace("\\", "/"),
    }
    if os.path.isdir(path):
        try:
            children = os.listdir(path)
        except PermissionError:
            children = []
        structure["children"] = [
            get_folder_structure(os.path.join(path, child), base_path) for child in children
        ]
    return structure

@app.get("/api/folder-structure")
async def folder_structure():
    backend_path = "./"
    if not os.path.exists(backend_path):
        return {"error": f"Path {backend_path} does not exist"}
    return get_folder_structure(backend_path, backend_path)

@app.get("/api/file-content", response_class=PlainTextResponse)
async def file_content(path: str):
    backend_path = "./"
    file_path = os.path.join(backend_path, path)
    if not os.path.isfile(file_path):
        return PlainTextResponse("File not found", status_code=404)
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return PlainTextResponse(f"Error reading file: {e}", status_code=500)

class FileSaveRequest(BaseModel):
    path: str
    content: str

# ---------- Encrypted Secret Handling ----------
class EncryptedSecretPayload(BaseModel):
    name: str
    encrypted: str
    iv: List[int]

# In-memory encrypted secret store
encrypted_secrets = {}

@app.post("/api/set-secret-key")
async def set_secret_key(payload: EncryptedSecretPayload):
    encrypted_secrets[payload.name] = {
        "ciphertext": payload.encrypted,
        "iv": payload.iv,
    }
    print(f"[Encrypted Secret Stored] {payload.name}")
    return {"message": f"Encrypted secret '{payload.name}' stored."}

# Optional debug endpoint
@app.get("/api/get-secrets")
async def get_secrets():
    return encrypted_secrets

@app.get("/api/get_routes")
async def get_routes():
    #set_data = syd_trains_data.all_route_data()
    set_data = postresql_main.sql_main()
    #data_processor.output_json('temp_route01',set_data)
    return set_data

@app.get("/api/get_route_info")
async def get_route_info(route_id: str = Query(...)):
    route_data = syd_trains_data.get_route_info(route_id)
    if route_data:
        return route_data
    else:
        return {"error": "Route not found"}

@app.get("/api/get_alerts")
async def get_alerts():
    #alert_data = syd_trains_data.all_alert_data()
    alert_data = syd_trains_data.temp_alert()
    return alert_data
    
if __name__ == "__main__":
    alert_data = syd_trains_data.all_alert_data()
    data_processor.output_json('final01',alert_data)
    