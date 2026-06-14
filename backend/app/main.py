from fastapi import FastAPI

from app.api.routes import router
from app.services.model_loader import load_model

from fastapi.middleware.cors import CORSMiddleware

# Create the main FastAPI application for the backend API.
app = FastAPI(
    title="Lung Tumor Platform API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes from the routes module.
app.include_router(router)


@app.on_event("startup")
def load_trained_model_on_startup():
    """Load the trained model once when the API starts."""
    try:
        load_model()
        print("Model loaded successfully.")
    except FileNotFoundError:
        print("Model checkpoint not found.")
