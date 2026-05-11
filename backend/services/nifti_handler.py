import io
import os
import tempfile
from typing import Any, Dict, Tuple

import nibabel as nib
import numpy as np
from PIL import Image


def _select_preview_slice(volume: np.ndarray) -> tuple[np.ndarray, int]:
    volume = np.squeeze(volume)

    if volume.ndim == 2:
        return volume, 0

    if volume.ndim >= 4:
        volume = volume[..., 0]

    if volume.ndim != 3:
        raise ValueError(f"Unsupported NIfTI shape for preview: {volume.shape}")

    scores = np.count_nonzero(np.abs(volume) > 0, axis=(0, 1))
    if not np.any(scores):
        scores = np.var(volume, axis=(0, 1))

    slice_index = int(np.argmax(scores))
    return volume[:, :, slice_index], slice_index


def _normalize_slice(slice_array: np.ndarray) -> np.ndarray:
    slice_array = np.nan_to_num(slice_array.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)

    if np.allclose(slice_array.max(), slice_array.min()):
        return np.zeros_like(slice_array, dtype=np.uint8)

    low = float(np.percentile(slice_array, 1))
    high = float(np.percentile(slice_array, 99))
    if high <= low:
        low = float(slice_array.min())
        high = float(slice_array.max())

    normalized = np.clip(slice_array, low, high)
    normalized = (normalized - low) / max(high - low, 1e-8)
    normalized = np.sqrt(np.clip(normalized, 0.0, 1.0))

    return (normalized * 255).astype(np.uint8)


def process_nifti(nifti_bytes: bytes, filename: str) -> Tuple[bytes, Image.Image, Dict[str, Any]]:
    suffix = ".nii.gz" if filename.lower().endswith(".nii.gz") else ".nii"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
        handle.write(nifti_bytes)
        tmp_path = handle.name
    try:
        image = nib.load(tmp_path)
        data = np.asarray(image.dataobj)
        voxel_spacing = [float(value) for value in image.header.get_zooms()[: min(3, len(image.header.get_zooms()))]]
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    preview_slice, slice_index = _select_preview_slice(data)
    normalized = _normalize_slice(preview_slice)
    pil_image = Image.fromarray(np.rot90(normalized)).convert("RGB")

    metadata = {
        "source_format": "nifti",
        "shape": list(data.shape),
        "slice_index": slice_index,
        "voxel_spacing": voxel_spacing,
    }

    output = io.BytesIO()
    pil_image.save(output, format="PNG")
    return output.getvalue(), pil_image, metadata
