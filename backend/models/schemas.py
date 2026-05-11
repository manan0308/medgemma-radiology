from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FileInfo(BaseModel):
    """Information about an uploaded file"""
    id: str
    filename: str
    content_type: str
    size: int
    upload_time: datetime
    preview_url: str
    metadata: Optional[dict] = None


class UploadResponse(BaseModel):
    """Response from file upload"""
    success: bool
    files: List[FileInfo]
    message: str


class AnalyzeRequest(BaseModel):
    """Request for image analysis"""
    file_ids: List[str]
    mode: str = "both"  # "technical", "simple", or "both"
    modality: str = "general"
    context: Optional[dict] = None
    generate_heatmap: bool = False


class AnalysisResult(BaseModel):
    """Result for a single image analysis"""
    file_id: str
    filename: str
    technical: Optional[str] = None
    simple: Optional[str] = None
    eli5: Optional[str] = None
    heatmap: Optional[str] = None
    error: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """Response from analysis endpoint"""
    success: bool
    results: List[AnalysisResult]
    message: str


class CompareRequest(BaseModel):
    """Request for comparing two uploaded studies"""
    current_file_id: str
    prior_file_id: str
    modality: str = "general"
    context: Optional[dict] = None


class CompareResponse(BaseModel):
    """Comparison response"""
    success: bool
    comparison: Optional[str] = None
    current_heatmap: Optional[str] = None
    prior_heatmap: Optional[str] = None
    message: str
    error: Optional[str] = None
