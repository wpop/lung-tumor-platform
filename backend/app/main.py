from fastapi import FastAPI

from app.api.routes import router
from app.services.model_loader import load_model


# Create the main FastAPI application for the backend API.
app = FastAPI(
    title="Lung Tumor Platform API",
    version="0.1.0",
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
