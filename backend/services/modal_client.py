import base64
import asyncio
import os
from typing import Dict, Optional

import httpx

# Timeout for Modal requests (model inference can take a while)
MODAL_TIMEOUT = 300.0


def get_modal_route_url(route: str) -> Optional[str]:
    """Normalize Modal config to the concrete route."""
    modal_endpoint_url = os.getenv("MODAL_ENDPOINT_URL", "").strip()
    if not modal_endpoint_url:
        return None
    route = route if route.startswith("/") else f"/{route}"
    if modal_endpoint_url.endswith(route):
        return modal_endpoint_url
    return f"{modal_endpoint_url.rstrip('/')}{route}"


def get_modal_analyze_url() -> Optional[str]:
    return get_modal_route_url("/analyze")


def get_modal_compare_url() -> Optional[str]:
    return get_modal_route_url("/compare")


async def _post_modal_json(route_url: str, payload: dict) -> Dict[str, Optional[str]]:
    async with httpx.AsyncClient(timeout=MODAL_TIMEOUT, follow_redirects=True) as client:
        response = await client.post(
            route_url,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type.lower():
            body_preview = (response.text or "")[:240]
            raise ValueError(f"Unexpected Modal response ({content_type}): {body_preview}")

        data = response.json()
        if data.get("eli5") and not data.get("simple"):
            data["simple"] = data["eli5"]
        return data


async def analyze_image(
    image_bytes: bytes,
    mode: str = "both",
    modality: str = "general",
    context: Optional[dict] = None,
    generate_heatmap: bool = False,
) -> Dict[str, Optional[str]]:
    """
    Send image to Modal for analysis

    Args:
        image_bytes: Preprocessed image as bytes
        mode: Analysis mode - "technical", "simple", or "both"

    Returns:
        Dict with "technical" and/or "simple" analysis results
    """
    modal_url = get_modal_analyze_url()
    if not modal_url:
        return analyze_image_mock(
            image_bytes,
            mode=mode,
            modality=modality,
            context=context,
            generate_heatmap=generate_heatmap,
        )

    # Encode image as base64
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    # Prepare request payload
    payload = {
        "image_base64": image_base64,
        "mode": mode,
        "modality": modality,
        "context": context,
        "generate_heatmap": generate_heatmap,
    }

    try:
        return await _post_modal_json(modal_url, payload)
    except httpx.TimeoutException:
        return {
            "error": "Analysis timed out. Please try again."
        }
    except httpx.HTTPStatusError as e:
        return {
            "error": f"Modal service error: {e.response.status_code}"
        }
    except Exception as e:
        return {
            "error": f"Failed to connect to analysis service: {str(e)}"
        }


async def compare_images(
    current_image_bytes: bytes,
    prior_image_bytes: bytes,
    modality: str = "general",
    context: Optional[dict] = None,
) -> Dict[str, Optional[str]]:
    modal_url = get_modal_compare_url()
    if not modal_url:
        return {
            "comparison": "Comparison service is not configured. Set MODAL_ENDPOINT_URL to enable live interval analysis."
        }

    payload = {
        "current_image_base64": base64.b64encode(current_image_bytes).decode("utf-8"),
        "prior_image_base64": base64.b64encode(prior_image_bytes).decode("utf-8"),
        "modality": modality,
        "context": context,
    }

    try:
        return await _post_modal_json(modal_url, payload)
    except httpx.TimeoutException:
        return {
            "error": "Comparison timed out. Please try again."
        }
    except httpx.HTTPStatusError as e:
        return {
            "error": f"Modal comparison service error: {e.response.status_code}"
        }
    except Exception as e:
        return {
            "error": f"Failed to connect to comparison service: {str(e)}"
        }


async def check_modal_health() -> bool:
    """Check if Modal endpoint is accessible"""
    modal_url = get_modal_analyze_url()
    if not modal_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            # Just check if the endpoint exists (OPTIONS request)
            response = await client.options(modal_url)
            return response.status_code < 500
    except Exception:
        return False


# Mock response for development/testing without Modal
MOCK_TECHNICAL_RESPONSE = """## Image Analysis Report

### 1. Image Type & Quality
This appears to be a **posteroanterior (PA) chest X-ray**. The image quality is adequate for diagnostic interpretation with appropriate exposure and positioning.

### 2. Anatomical Structures
- **Heart**: Normal cardiac silhouette, cardiothoracic ratio within normal limits
- **Lungs**: Both lung fields are adequately visualized
- **Mediastinum**: Normal width and contour
- **Diaphragm**: Both hemidiaphragms are visible with normal contour
- **Bony structures**: Visible ribs and clavicles appear intact

### 3. Findings
- Lung fields appear clear without obvious consolidation or effusion
- No obvious masses or nodules identified
- Costophrenic angles appear sharp bilaterally
- No pneumothorax evident

### 4. Clinical Significance
The visualized structures appear within normal limits. No acute cardiopulmonary abnormality is identified on this examination.

### 5. Recommendations
- Clinical correlation recommended
- Follow-up as clinically indicated

**Disclaimer**: This analysis is generated by an AI model for educational purposes only. It should not be used for clinical diagnosis. Please consult a qualified healthcare professional."""

MOCK_ELI5_RESPONSE = """This is a picture that shows the inside of someone's chest - like an X-ray superhero vision!

I can see the heart in the middle (it looks like a friendly blob!), and the lungs on both sides (they look like two fluffy clouds).

Everything looks nice and healthy, like all the puzzle pieces are in the right places! The doctor will be happy to see this picture."""


async def analyze_image_mock(
    image_bytes: bytes,
    mode: str = "both",
    modality: str = "general",
    context: Optional[dict] = None,
    generate_heatmap: bool = False,
) -> Dict[str, Optional[str]]:
    """
    Mock analysis for development without Modal
    """
    # Simulate processing time
    await asyncio.sleep(2)

    results = {}

    if mode in ["technical", "both"]:
        results["technical"] = MOCK_TECHNICAL_RESPONSE

    if mode in ["simple", "eli5", "both"]:
        results["simple"] = MOCK_ELI5_RESPONSE
        results["eli5"] = MOCK_ELI5_RESPONSE

    return results


# Use mock in development if Modal URL not configured
def get_analyzer():
    """Get the appropriate analyzer function based on configuration"""
    if not get_modal_analyze_url():
        print("WARNING: Using mock analyzer. Set MODAL_ENDPOINT_URL for real analysis.")
        return analyze_image_mock
    return analyze_image
