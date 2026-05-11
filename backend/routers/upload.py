from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from typing import List
import os
import uuid
from datetime import datetime
import aiofiles

from models.schemas import UploadResponse, FileInfo
from services.dicom_handler import is_dicom_file, process_dicom
from services.nifti_handler import process_nifti

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
ALLOWED_EXTENSIONS = {".dcm", ".png", ".jpg", ".jpeg", ".nii", ".nii.gz"}
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "100")) * 1024 * 1024  # 100MB default


def get_file_extension(filename: str) -> str:
    """Get file extension, handling .nii.gz specially"""
    if filename.lower().endswith(".nii.gz"):
        return ".nii.gz"
    return os.path.splitext(filename)[1].lower()


def validate_file(filename: str, size: int) -> None:
    """Validate file extension and size"""
    ext = get_file_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )


def build_preview_url(request: Request, filename: str) -> str:
    return str(request.url_for("uploads", path=filename))


@router.post("/upload", response_model=UploadResponse)
async def upload_files(request: Request, files: List[UploadFile] = File(...)):
    """
    Upload one or more medical image files

    Supports: .dcm (DICOM), .png, .jpg, .jpeg, .nii, .nii.gz
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    uploaded_files = []
    errors = []

    for file in files:
        try:
            # Read file content
            content = await file.read()
            file_size = len(content)

            # Validate
            validate_file(file.filename, file_size)

            # Generate unique ID
            file_id = str(uuid.uuid4())
            ext = get_file_extension(file.filename)

            # Process DICOM files to extract PNG preview
            if ext == ".dcm" or is_dicom_file(content):
                try:
                    png_bytes, _, metadata = process_dicom(content)
                    # Save as PNG for preview
                    preview_filename = f"{file_id}.png"
                    preview_path = os.path.join(UPLOAD_DIR, preview_filename)
                    async with aiofiles.open(preview_path, "wb") as f:
                        await f.write(png_bytes)

                    # Also save original DICOM
                    original_filename = f"{file_id}.dcm"
                    original_path = os.path.join(UPLOAD_DIR, original_filename)
                    async with aiofiles.open(original_path, "wb") as f:
                        await f.write(content)

                    file_info = FileInfo(
                        id=file_id,
                        filename=file.filename,
                        content_type="application/dicom",
                        size=file_size,
                        upload_time=datetime.now(),
                        preview_url=build_preview_url(request, preview_filename),
                        metadata={**metadata, "source_format": "dicom"}
                    )
                except Exception as e:
                    errors.append(f"{file.filename}: Failed to process DICOM - {str(e)}")
                    continue
            elif ext in {".nii", ".nii.gz"}:
                try:
                    png_bytes, _, metadata = process_nifti(content, file.filename)

                    preview_filename = f"{file_id}.png"
                    preview_path = os.path.join(UPLOAD_DIR, preview_filename)
                    async with aiofiles.open(preview_path, "wb") as f:
                        await f.write(png_bytes)

                    original_filename = f"{file_id}{ext}"
                    original_path = os.path.join(UPLOAD_DIR, original_filename)
                    async with aiofiles.open(original_path, "wb") as f:
                        await f.write(content)

                    file_info = FileInfo(
                        id=file_id,
                        filename=file.filename,
                        content_type=file.content_type or "application/gzip",
                        size=file_size,
                        upload_time=datetime.now(),
                        preview_url=build_preview_url(request, preview_filename),
                        metadata=metadata
                    )
                except Exception as e:
                    errors.append(f"{file.filename}: Failed to process NIfTI - {str(e)}")
                    continue
            else:
                # Regular image file
                save_filename = f"{file_id}{ext}"
                save_path = os.path.join(UPLOAD_DIR, save_filename)
                async with aiofiles.open(save_path, "wb") as f:
                    await f.write(content)

                file_info = FileInfo(
                    id=file_id,
                    filename=file.filename,
                    content_type=file.content_type or "image/png",
                    size=file_size,
                    upload_time=datetime.now(),
                    preview_url=build_preview_url(request, save_filename),
                    metadata={"source_format": ext.lstrip(".")}
                )

            uploaded_files.append(file_info)

        except HTTPException:
            raise
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")

    if not uploaded_files and errors:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to upload files: {'; '.join(errors)}"
        )

    message = f"Successfully uploaded {len(uploaded_files)} file(s)"
    if errors:
        message += f". Errors: {'; '.join(errors)}"

    return UploadResponse(
        success=True,
        files=uploaded_files,
        message=message
    )


@router.get("/images/{file_id}")
async def get_image(file_id: str):
    """Get uploaded image by ID"""
    # Look for the file with any extension
    for ext in [".png", ".jpg", ".jpeg", ".dcm", ".nii", ".nii.gz"]:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(file_path):
            return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="Image not found")


@router.delete("/images/{file_id}")
async def delete_image(file_id: str):
    """Delete uploaded image"""
    deleted = False
    for ext in [".png", ".jpg", ".jpeg", ".dcm", ".nii", ".nii.gz"]:
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(file_path):
            os.remove(file_path)
            deleted = True

    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found")

    return {"success": True, "message": "Image deleted"}
