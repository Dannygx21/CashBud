from fastapi import FastAPI

from server.db import database, User

app = FastAPI()

@app.get("/")
async def read_root():
    return await User.objects.all()

@app.on_event("startup")
async def start():
    if not database.is_connected:
        await database.connect()
    # create dummy entry
    await User.objects.get_or_create(first_name="Dummy", last_name="User")

@app.on_event("shutdown")
async def shutdown():
    if database.is_connected:
        await database.disconnect()
