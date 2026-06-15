from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
import nibabel as nib
import numpy as np
import torch

from app.services.export_service import create_ct_slice_png, create_overlay_png
from app.services.model_loader import get_model_status
from app.services.inference_service import run_full_volume_inference


# Keep endpoint definitions together on a shared API router.
router = APIRouter()

HU_MIN = -1000
HU_MAX = 400
VOLUME_TARGET_SHAPE = (128, 128, 64)


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

    return FileResponse(
        path=overlay_path,
        media_type="image/png",
        filename=f"{case_id}_overlay.png",
    )


@router.get("/results/{case_id}/overlay/{slice_index}")
def get_result_overlay_slice(case_id: str, slice_index: int):
    # Generate and serve a mask overlay PNG for the requested axial slice.
    volume_path = Path("uploads") / f"{case_id}.nii.gz"
    mask_path = Path("outputs") / case_id / "predicted_mask.nii.gz"

    if not volume_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded CT not found.")
    if not mask_path.exists():
        raise HTTPException(status_code=404, detail="Predicted mask not found.")

    volume_shape = nib.load(str(volume_path)).shape
    mask_shape = nib.load(str(mask_path)).shape
    if (
        len(volume_shape) < 3
        or len(mask_shape) < 3
        or slice_index < 0
        or slice_index >= volume_shape[2]
        or slice_index >= mask_shape[2]
    ):
        raise HTTPException(status_code=400, detail="Invalid slice index.")

    output_path = (
        Path("outputs")
        / case_id
        / "slices"
        / f"overlay_{slice_index:03d}.png"
    )
    create_overlay_png(volume_path, mask_path, slice_index, output_path)

    return FileResponse(
        path=output_path,
        media_type="image/png",
    )


@router.get("/results/{case_id}/ct/{slice_index}")
def get_result_ct_slice(case_id: str, slice_index: int):
    # Generate and serve the original CT image for the requested axial slice.
    volume_path = Path("uploads") / f"{case_id}.nii.gz"

    if not volume_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded CT not found.")

    volume_shape = nib.load(str(volume_path)).shape
    if len(volume_shape) < 3 or slice_index < 0 or slice_index >= volume_shape[2]:
        raise HTTPException(status_code=400, detail="Invalid slice index.")

    output_path = (
        Path("outputs")
        / case_id
        / "slices"
        / f"ct_{slice_index:03d}.png"
    )
    try:
        create_ct_slice_png(volume_path, slice_index, output_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid slice index.") from exc

    return FileResponse(
        path=output_path,
        media_type="image/png",
    )


@router.get("/results/{case_id}/volume-data")
def get_result_volume_data(case_id: str):
    # Serve a browser-sized uint8 CT volume for VTK.js rendering.
    volume_path = Path("uploads") / f"{case_id}.nii.gz"

    if not volume_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded CT not found.")

    volume = nib.load(str(volume_path)).get_fdata(dtype=np.float32)
    if volume.ndim < 3:
        raise HTTPException(status_code=400, detail="Invalid CT volume.")

    volume = volume[:, :, :, 0] if volume.ndim > 3 else volume
    strides = tuple(
        max(1, int(np.ceil(size / target_size)))
        for size, target_size in zip(volume.shape[:3], VOLUME_TARGET_SHAPE)
    )
    downsampled = volume[:: strides[0], :: strides[1], :: strides[2]]

    clipped = np.clip(downsampled, HU_MIN, HU_MAX)
    normalized = (clipped - HU_MIN) / (HU_MAX - HU_MIN)
    uint8_volume = np.rint(normalized * 255).astype(np.uint8)

    return {
        "dimensions": list(uint8_volume.shape),
        "spacing": [1, 1, 1],
        "scalars": uint8_volume.ravel(order="F").tolist(),
    }


@router.get("/results/{case_id}/mask")
def get_result_mask(case_id: str):
    # Serve the generated binary mask NIfTI file for a completed case.
    mask_path = Path("outputs") / case_id / "predicted_mask.nii.gz"
    if not mask_path.exists():
        raise HTTPException(status_code=404, detail="Predicted mask not found.")

    return FileResponse(
        path=mask_path,
        media_type="application/gzip",
        filename=f"{case_id}_predicted_mask.nii.gz",
    )


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
