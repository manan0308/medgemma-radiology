#!/usr/bin/env python3

from __future__ import annotations

import json
import shutil
from pathlib import Path

from datasets import Dataset
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT / "frontend" / "public" / "loadable-samples"

AIO_PARQUET = ROOT / "datasets" / "hf_downloads" / "AIOmarRehan_Brain_Tumor_MRI_Dataset" / "data" / "test-00000-of-00001.parquet"
XRAY_PARQUET = ROOT / "datasets" / "hf_downloads" / "hf-vision_chest-xray-pneumonia" / "data" / "test-00000-of-00001.parquet"
CT_ROOT = ROOT / "datasets" / "hf_downloads" / "Mahadih534_Chest_CT_Scan_images_Dataset" / "test"
GLIODIL_RENDER_DIR = ROOT / "frontend" / "public" / "demo" / "gliodil" / "case-539-progression"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_image(image: Image.Image, path: Path) -> None:
    ensure_dir(path.parent)
    image.convert("RGB").save(path, format="PNG")


def export_brain_mri_samples() -> list[dict[str, str]]:
    dataset = Dataset.from_parquet(str(AIO_PARQUET))
    label_names = dataset.features["label"].names
    out_dir = PUBLIC_DIR / "brain-mri"
    ensure_dir(out_dir)

    wanted = {
        "glioma": "glioma",
        "meningioma": "meningioma",
        "pituitary": "pituitary",
        "notumor": "no-tumor",
    }

    seen = set()
    exported: list[dict[str, str]] = []

    for index, row in enumerate(dataset):
        label_name = label_names[int(row["label"])]
        if label_name not in wanted or label_name in seen:
            continue
        filename = f"{wanted[label_name]}.png"
        path = out_dir / filename
        save_image(row["image"], path)
        exported.append(
            {
                "key": wanted[label_name],
                "path": f"/loadable-samples/brain-mri/{filename}",
                "source": "AIOmarRehan/Brain_Tumor_MRI_Dataset",
            }
        )
        seen.add(label_name)
        if len(seen) == len(wanted):
            break

    for role in ["prior", "current", "overlay"]:
        src = GLIODIL_RENDER_DIR / f"{role}.png"
        dst = out_dir / f"gliodil-539-{role}.png"
        shutil.copyfile(src, dst)
        exported.append(
            {
                "key": f"gliodil-539-{role}",
                "path": f"/loadable-samples/brain-mri/gliodil-539-{role}.png",
                "source": "m1balcerak/GliODIL",
            }
        )

    return exported


def export_xray_samples() -> list[dict[str, str]]:
    dataset = Dataset.from_parquet(str(XRAY_PARQUET))
    label_names = dataset.features["label"].names
    out_dir = PUBLIC_DIR / "chest-xray"
    ensure_dir(out_dir)

    wanted = {"NORMAL": "normal", "PNEUMONIA": "pneumonia"}
    seen = set()
    exported: list[dict[str, str]] = []

    for row in dataset:
        label_name = label_names[int(row["label"])]
        if label_name not in wanted or label_name in seen:
            continue
        filename = f"{wanted[label_name]}.png"
        path = out_dir / filename
        save_image(row["image"], path)
        exported.append(
            {
                "key": wanted[label_name],
                "path": f"/loadable-samples/chest-xray/{filename}",
                "source": "hf-vision/chest-xray-pneumonia",
            }
        )
        seen.add(label_name)
        if len(seen) == len(wanted):
            break

    return exported


def export_ct_samples() -> list[dict[str, str]]:
    out_dir = PUBLIC_DIR / "chest-ct"
    ensure_dir(out_dir)

    picks = {
        "normal": sorted((CT_ROOT / "normal").glob("*.png"))[:1],
        "adenocarcinoma": sorted((CT_ROOT / "adenocarcinoma").glob("*.png"))[:1],
        "large-cell": sorted((CT_ROOT / "large.cell.carcinoma").glob("*.png"))[:1],
        "squamous": sorted((CT_ROOT / "squamous.cell.carcinoma").glob("*.png"))[:1],
    }

    exported: list[dict[str, str]] = []
    for key, files in picks.items():
        if not files:
            continue
        filename = f"{key}.png"
        dst = out_dir / filename
        shutil.copyfile(files[0], dst)
        exported.append(
            {
                "key": key,
                "path": f"/loadable-samples/chest-ct/{filename}",
                "source": "Mahadih534/Chest_CT-Scan_images-Dataset",
            }
        )

    return exported


def main() -> None:
    ensure_dir(PUBLIC_DIR)

    manifest = {
        "brain_mri": export_brain_mri_samples(),
        "chest_xray": export_xray_samples(),
        "chest_ct": export_ct_samples(),
    }

    manifest_path = PUBLIC_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {manifest_path.relative_to(ROOT)}")
    for key, rows in manifest.items():
        print(f"{key}: {len(rows)} file(s)")


if __name__ == "__main__":
    main()
