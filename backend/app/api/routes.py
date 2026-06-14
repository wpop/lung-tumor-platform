from pathlib import Path

from fastapi import APIRouter, File, UploadFile
import torch

from app.services.model_loader import get_model_status
from app.services.inference_service import run_volume_scan_summary


# Keep endpoint definitions together on a shared API router.
router = APIRouter()


@router.get("/")
def read_root():
    # Return a simple welcome message for the API root.
    return {"message": "Welcome to Lung Tumor Platform API"}


@router.get("/health")
def read_health():
    # Report basic service health and whether CUDA is available to PyTorch.
    return {
        "status": "ok",
        "gpu": torch.cuda.is_available(),
    }


@router.get("/model/status")
def read_model_status():
    # Report cached model status without triggering a model load.
    return get_model_status()


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Create the uploads directory when it does not already exist.
    upload_dir = Path("uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save the uploaded file using its original filename.
    saved_path = upload_dir / file.filename
    file_bytes = await file.read()
    saved_path.write_bytes(file_bytes)

    # Run a simple full-volume scan after the upload is saved.
    inference = run_volume_scan_summary(saved_path)

    return {
        "message": "Prediction completed for volume scan.",
        "filename": file.filename,
        "saved_to": str(saved_path),
        "inference": inference,
    }
