from fastapi import FastAPI
from app import models
from app.database import engine

# モデルをDBに反映
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, Docker with FastAPI!"}
