#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import shutil
from pathlib import Path

import nibabel as nib
import numpy as np
from datasets import Dataset
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "datasets" / "converted"

AIO_PARQUET = ROOT / "datasets" / "hf_downloads" / "AIOmarRehan_Brain_Tumor_MRI_Dataset" / "data" / "test-00000-of-00001.parquet"
XRAY_DIR = ROOT / "datasets" / "hf_downloads" / "hf-vision_chest-xray-pneumonia" / "data"
CT_ROOT = ROOT / "datasets" / "hf_downloads" / "Mahadih534_Chest_CT_Scan_images_Dataset"
GLIODIL_ROOT = ROOT / "datasets" / "GliODIL" / "data_GliODIL_essential"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_png(image: Image.Image, path: Path) -> None:
    ensure_dir(path.parent)
    image.convert("RGB").save(path, format="PNG")


def normalize_background(background: np.ndarray) -> np.ndarray:
    background = np.asarray(background, dtype=np.float32)
    lo = float(np.nanmin(background))
    hi = float(np.nanmax(background))
    if hi > lo:
        background = (background - lo) / (hi - lo)
    else:
        background = np.zeros_like(background, dtype=np.float32)
    return np.sqrt(np.clip(background, 0.0, 1.0))


def tint_mask(background: np.ndarray, mask: np.ndarray, color: tuple[float, float, float]) -> np.ndarray:
    rgb = np.repeat(background[..., None], 3, axis=-1)
    rgb = np.clip(rgb * 0.9 + 0.04, 0.0, 1.0)
    alpha = 0.78
    rgb[mask] = (1.0 - alpha) * rgb[mask] + alpha * np.array(color, dtype=np.float32)
    return np.clip(rgb, 0.0, 1.0)


def save_rgb_array(array: np.ndarray, path: Path) -> None:
    ensure_dir(path.parent)
    Image.fromarray(np.clip(array * 255.0, 0, 255).astype(np.uint8), mode="RGB").save(path)


def convert_aio(out_dir: Path, manifest_rows: list[dict[str, str]]) -> int:
    dataset = Dataset.from_parquet(str(AIO_PARQUET))
    label_names = dataset.features["label"].names
    dataset_out = out_dir / "brain-mri" / "aio"
    count = 0

    for index, row in enumerate(dataset):
        label_name = label_names[int(row["label"])]
        path = dataset_out / label_name / f"{index:05d}.png"
        save_png(row["image"], path)
        manifest_rows.append(
            {
                "bucket": "brain_mri",
                "source": "AIOmarRehan/Brain_Tumor_MRI_Dataset",
                "label": label_name,
                "path": str(path.relative_to(out_dir)),
            }
        )
        count += 1

    return count


def convert_xray(out_dir: Path, manifest_rows: list[dict[str, str]]) -> int:
    dataset_out = out_dir / "chest-xray" / "hf-vision"
    count = 0

    for parquet_path in sorted(XRAY_DIR.glob("*.parquet")):
        dataset = Dataset.from_parquet(str(parquet_path))
        label_names = dataset.features["label"].names
        split = parquet_path.stem.split("-")[0]
        for index, row in enumerate(dataset):
            label_name = label_names[int(row["label"])]
            path = dataset_out / split / label_name.lower() / f"{index:05d}.png"
            save_png(row["image"], path)
            manifest_rows.append(
                {
                    "bucket": "chest_xray",
                    "source": "hf-vision/chest-xray-pneumonia",
                    "label": f"{split}:{label_name}",
                    "path": str(path.relative_to(out_dir)),
                }
            )
            count += 1

    return count


def convert_ct(out_dir: Path, manifest_rows: list[dict[str, str]]) -> int:
    dataset_out = out_dir / "chest-ct" / "Mahadih534"
    count = 0

    for source in sorted(CT_ROOT.rglob("*.png")):
        relative = source.relative_to(CT_ROOT)
        path = dataset_out / relative
        ensure_dir(path.parent)
        shutil.copy2(source, path)
        label = "/".join(relative.parts[:2]) if len(relative.parts) >= 2 else relative.parent.name
        manifest_rows.append(
            {
                "bucket": "chest_ct",
                "source": "Mahadih534/Chest_CT-Scan_images-Dataset",
                "label": label,
                "path": str(path.relative_to(out_dir)),
            }
        )
        count += 1

    return count


def convert_gliodil(out_dir: Path, manifest_rows: list[dict[str, str]]) -> int:
    dataset_out = out_dir / "brain-mri-longitudinal" / "GliODIL"
    count = 0

    for case_dir in sorted(path for path in GLIODIL_ROOT.iterdir() if path.is_dir()):
        case_id = case_dir.name.replace("data_", "")
        wm = np.asarray(nib.load(str(case_dir / "t1_wm.nii.gz")).dataobj, dtype=np.float32)
        gm = np.asarray(nib.load(str(case_dir / "t1_gm.nii.gz")).dataobj, dtype=np.float32)
        csf = np.asarray(nib.load(str(case_dir / "t1_csf.nii.gz")).dataobj, dtype=np.float32)
        baseline_mask = np.asarray(nib.load(str(case_dir / "segm.nii.gz")).dataobj) > 0
        followup_mask = np.asarray(nib.load(str(case_dir / "segm_rec.nii.gz")).dataobj) > 0

        slice_scores = (baseline_mask.astype(np.uint8) + (2 * followup_mask.astype(np.uint8))).sum(axis=(0, 1))
        axial_slice = int(slice_scores.argmax())
        background = normalize_background(
            (0.55 * wm[:, :, axial_slice]) + (0.30 * gm[:, :, axial_slice]) + (0.15 * csf[:, :, axial_slice])
        )

        prior = np.rot90(tint_mask(background, baseline_mask[:, :, axial_slice], (0.05, 0.78, 1.0)))
        current = np.rot90(tint_mask(background, followup_mask[:, :, axial_slice], (1.0, 0.47, 0.10)))

        overlap = baseline_mask[:, :, axial_slice] & followup_mask[:, :, axial_slice]
        overlay = tint_mask(background, baseline_mask[:, :, axial_slice], (0.05, 0.78, 1.0))
        overlay = tint_mask(overlay.mean(axis=-1), followup_mask[:, :, axial_slice], (1.0, 0.47, 0.10))
        overlay = np.rot90(overlay)
        overlay[np.rot90(overlap)] = np.array((1.0, 0.88, 0.15), dtype=np.float32)

        for role, image in [("prior", prior), ("current", current), ("overlay", overlay)]:
            path = dataset_out / case_id / f"{role}.png"
            save_rgb_array(image, path)
            manifest_rows.append(
                {
                    "bucket": "brain_mri_longitudinal",
                    "source": "m1balcerak/GliODIL",
                    "label": f"{case_id}:{role}",
                    "path": str(path.relative_to(out_dir)),
                }
            )
            count += 1

    return count


def write_manifest(out_dir: Path, rows: list[dict[str, str]], summary: dict[str, int]) -> None:
    manifest_csv = out_dir / "manifest.csv"
    manifest_json = out_dir / "manifest.json"

    with manifest_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["bucket", "source", "label", "path"])
        writer.writeheader()
        writer.writerows(rows)

    manifest_json.write_text(
        json.dumps({"summary": summary, "files": rows}, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bulk convert local medical datasets into loadable PNG trees.")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT, help="Output directory for converted files.")
    parser.add_argument("--skip-aio", action="store_true", help="Skip parquet brain MRI conversion.")
    parser.add_argument("--skip-xray", action="store_true", help="Skip chest X-ray parquet conversion.")
    parser.add_argument("--skip-ct", action="store_true", help="Skip CT image mirroring.")
    parser.add_argument("--skip-gliodil", action="store_true", help="Skip GliODIL NIfTI conversion.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir = args.out_dir.resolve()
    ensure_dir(out_dir)

    manifest_rows: list[dict[str, str]] = []
    summary: dict[str, int] = {}

    if not args.skip_aio:
        summary["brain_mri"] = convert_aio(out_dir, manifest_rows)
    if not args.skip_xray:
        summary["chest_xray"] = convert_xray(out_dir, manifest_rows)
    if not args.skip_ct:
        summary["chest_ct"] = convert_ct(out_dir, manifest_rows)
    if not args.skip_gliodil:
        summary["brain_mri_longitudinal"] = convert_gliodil(out_dir, manifest_rows)

    write_manifest(out_dir, manifest_rows, summary)

    print(f"Wrote converted datasets to {out_dir.relative_to(ROOT)}")
    for key, value in summary.items():
        print(f"{key}: {value} file(s)")


if __name__ == "__main__":
    main()
