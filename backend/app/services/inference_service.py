from pathlib import Path

import nibabel as nib
import numpy as np
import torch

from app.services.model_loader import load_model


HU_MIN = -1000
HU_MAX = 400


def _normalize_slice(slice_data):
    # Clip and normalize Hounsfield units to the [0, 1] range.
    normalized_slice = np.clip(slice_data, HU_MIN, HU_MAX)
    normalized_slice = (normalized_slice - HU_MIN) / (HU_MAX - HU_MIN)
    return normalized_slice.astype(np.float32)


def run_single_slice_inference(volume_path: str | Path) -> dict:
    """Run inference on the middle axial slice of a NIfTI volume."""
    volume = nib.load(str(volume_path)).get_fdata()
    middle_slice = volume[:, :, volume.shape[2] // 2]

    normalized_slice = _normalize_slice(middle_slice)

    # Convert the 2D slice to a BCHW tensor: (1, 1, H, W).
    input_tensor = torch.from_numpy(normalized_slice).unsqueeze(0).unsqueeze(0)

    model = load_model()
    device = next(model.parameters()).device
    input_tensor = input_tensor.to(device)

    # Run one forward pass and convert logits to probabilities.
    with torch.no_grad():
        logits = model(input_tensor)
        probabilities = torch.sigmoid(logits)

    probabilities = probabilities.detach().cpu()
    height, width = normalized_slice.shape

    return {
        "input_shape": [height, width],
        "probability_min": float(probabilities.min().item()),
        "probability_max": float(probabilities.max().item()),
        "probability_mean": float(probabilities.mean().item()),
    }


def run_volume_scan_summary(volume_path: str | Path) -> dict:
    """Scan all axial slices and summarize the strongest model response."""
    volume = nib.load(str(volume_path)).get_fdata()
    height, width, depth = volume.shape

    model = load_model()
    device = next(model.parameters()).device

    best_slice_index = None
    best_probability_max = None
    best_probability_mean = None

    with torch.no_grad():
        for slice_index in range(depth):
            normalized_slice = _normalize_slice(volume[:, :, slice_index])

            # Convert the 2D slice to a BCHW tensor: (1, 1, H, W).
            input_tensor = (
                torch.from_numpy(normalized_slice)
                .unsqueeze(0)
                .unsqueeze(0)
                .to(device)
            )

            probabilities = torch.sigmoid(model(input_tensor)).detach().cpu()
            probability_max = float(probabilities.max().item())
            probability_mean = float(probabilities.mean().item())

            if best_probability_max is None or probability_max > best_probability_max:
                best_slice_index = slice_index
                best_probability_max = probability_max
                best_probability_mean = probability_mean

    return {
        "volume_shape": [height, width, depth],
        "best_slice_index": best_slice_index,
        "best_probability_max": best_probability_max,
        "best_probability_mean": best_probability_mean,
    }
