from fastapi import FastAPI

from app.api.routes import router


# Create the main FastAPI application for the backend API.
app = FastAPI(
    title="Lung Tumor Platform API",
    version="0.1.0",
)

# Register API routes from the routes module.
app.include_router(router)
