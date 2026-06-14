from pathlib import Path

import nibabel as nib
import numpy as np
from PIL import Image


HU_MIN = -1000
HU_MAX = 400


def create_ct_slice_png(
    volume_path: str | Path,
    slice_index: int,
    output_path: str | Path,
) -> str:
    """Create a grayscale PNG for one axial CT slice."""
    volume = nib.load(str(volume_path)).get_fdata()
    if len(volume.shape) < 3 or slice_index < 0 or slice_index >= volume.shape[2]:
        raise ValueError("Invalid slice index.")

    ct_slice = volume[:, :, slice_index]

    # Normalize CT Hounsfield units to an 8-bit grayscale image.
    normalized_slice = np.clip(ct_slice, HU_MIN, HU_MAX)
    normalized_slice = (normalized_slice - HU_MIN) / (HU_MAX - HU_MIN)
    grayscale = (normalized_slice * 255).astype(np.uint8)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(grayscale).save(output_path)

    return str(output_path)


def create_overlay_png(
    volume_path: str | Path,
    mask_path: str | Path,
    slice_index: int,
    output_path: str | Path,
) -> str:
    """Create a red mask overlay PNG for one axial CT slice."""
    volume = nib.load(str(volume_path)).get_fdata()
    mask = nib.load(str(mask_path)).get_fdata()

    ct_slice = volume[:, :, slice_index]
    mask_slice = mask[:, :, slice_index] > 0

    # Normalize CT Hounsfield units to an 8-bit grayscale image.
    normalized_slice = np.clip(ct_slice, HU_MIN, HU_MAX)
    normalized_slice = (normalized_slice - HU_MIN) / (HU_MAX - HU_MIN)
    grayscale = (normalized_slice * 255).astype(np.uint8)

    rgb_image = np.stack([grayscale, grayscale, grayscale], axis=-1)

    # Blend positive mask pixels with red.
    alpha = 0.45
    red = np.array([255, 0, 0], dtype=np.float32)
    rgb_float = rgb_image.astype(np.float32)
    rgb_float[mask_slice] = (1 - alpha) * rgb_float[mask_slice] + alpha * red

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgb_float.astype(np.uint8)).save(output_path)

    return str(output_path)
