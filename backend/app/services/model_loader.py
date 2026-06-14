from pathlib import Path


# Keep one model instance in memory after the first successful load.
_model = None
_device = None


def load_model():
    """Load and cache the trained UNet2D model."""
    global _model, _device

    # Return the cached model so requests do not reload the checkpoint.
    if _model is not None:
        return _model

    # Resolve backend/checkpoints/best_unet2d.pt from this service file.
    backend_dir = Path(__file__).resolve().parents[2]
    checkpoint_path = backend_dir / "checkpoints" / "best_unet2d.pt"

    # Fail clearly if the checkpoint has not been added to the project.
    if not checkpoint_path.exists():
        raise FileNotFoundError(
            f"Model checkpoint not found at: {checkpoint_path}"
        )

    import torch
    from app.models.unet2d import UNet2D

    # Use CUDA when it is available, otherwise keep the model on CPU.
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = UNet2D()

    # Load the checkpoint onto the selected device.
    checkpoint = torch.load(checkpoint_path, map_location=device)

    # Support common checkpoint formats while keeping inference out of this file.
    if isinstance(checkpoint, dict):
        if "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]
        elif "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint

        model.load_state_dict(state_dict)
    else:
        model = checkpoint

    # Move the model to the selected device and set evaluation mode.
    model = model.to(device)
    model.eval()

    _model = model
    _device = device
    return model


def get_model_status():
    """Return cached model load status without loading the model."""
    return {
        "model_loaded": _model is not None,
        "device": _device.type if _device is not None else None,
    }
