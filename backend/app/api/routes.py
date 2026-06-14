from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
import torch

from app.services.model_loader import get_model_status
from app.services.inference_service import run_full_volume_inference


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


@router.get("/results/{case_id}/overlay")
def get_result_overlay(case_id: str):
    # Serve the generated overlay PNG for a completed case.
    overlay_path = Path("outputs") / case_id / "overlay.png"
    if not overlay_path.exists():
        raise HTTPException(status_code=404, detail="Overlay not found.")

    return FileResponse(overlay_path, media_type="image/png")


@router.get("/results/{case_id}/mask")
def get_result_mask(case_id: str):
    # Serve the generated binary mask NIfTI file for a completed case.
    mask_path = Path("outputs") / case_id / "predicted_mask.nii.gz"
    if not mask_path.exists():
        raise HTTPException(status_code=404, detail="Predicted mask not found.")

    return FileResponse(mask_path, media_type="application/gzip")


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Create the uploads directory when it does not already exist.
    upload_dir = Path("uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save the uploaded file using its original filename.
    saved_path = upload_dir / file.filename
    file_bytes = await file.read()
    saved_path.write_bytes(file_bytes)

    # Run full-volume inference and save the predicted mask.
    inference = run_full_volume_inference(saved_path)

    return {
        "message": "Prediction completed and mask saved.",
        "filename": file.filename,
        "saved_to": str(saved_path),
        "inference": inference,
    }
