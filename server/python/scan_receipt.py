#!/usr/bin/env python3
"""
scan_receipt.py — Convert a receipt photo to a clean black-and-white scan PDF.
Ported from the original cowork pipeline. Usage:
  python3 scan_receipt.py input.<img> output.pdf

Grayscale, auto-crop border, contrast/sharpness, gentle local normalisation
(scanner look), centred on an off-white A4-ish canvas, saved as a 150dpi PDF.
The server calls this in a temp dir and deletes everything afterwards.
"""
import sys
from pathlib import Path


def _deskew(pil_img):
    """Flatten a receipt photographed at an angle via a four-point perspective transform.
    Returns a corrected PIL image, or None to fall back to the original (no clean
    document rectangle found, or OpenCV/numpy unavailable). Never raises."""
    try:
        import cv2
        import numpy as np
        from PIL import Image
    except Exception:
        return None
    try:
        rgb = pil_img.convert("RGB")
        full = np.array(rgb)[:, :, ::-1]  # RGB -> BGR
        h, w = full.shape[:2]
        ratio = 1000.0 / max(h, w)
        small = cv2.resize(full, (int(w * ratio), int(h * ratio))) if ratio < 1 else full.copy()
        gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), (5, 5), 0)
        edges = cv2.dilate(cv2.Canny(gray, 50, 150), np.ones((3, 3), np.uint8), iterations=1)
        cnts, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        area_small = small.shape[0] * small.shape[1]
        quad = None
        for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:5]:
            approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
            if len(approx) == 4 and cv2.isContourConvex(approx) and cv2.contourArea(approx) > 0.25 * area_small:
                quad = approx.reshape(4, 2).astype("float32") / ratio
                break
        if quad is None:
            return None
        # order corners: tl, tr, br, bl
        rect = np.zeros((4, 2), dtype="float32")
        s = quad.sum(axis=1)
        rect[0], rect[2] = quad[np.argmin(s)], quad[np.argmax(s)]
        d = np.diff(quad, axis=1)
        rect[1], rect[3] = quad[np.argmin(d)], quad[np.argmax(d)]
        (tl, tr, br, bl) = rect
        maxW = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        maxH = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
        if maxW < 80 or maxH < 80:
            return None
        dst = np.array([[0, 0], [maxW - 1, 0], [maxW - 1, maxH - 1], [0, maxH - 1]], dtype="float32")
        warped = cv2.warpPerspective(full, cv2.getPerspectiveTransform(rect, dst), (maxW, maxH))
        return Image.fromarray(warped[:, :, ::-1])  # BGR -> RGB
    except Exception:
        return None


def process(input_path: str, output_path: str) -> str:
    from PIL import Image, ImageOps, ImageEnhance, ImageChops, ImageFilter

    img = Image.open(input_path)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # Straighten an angled receipt first; on no-confident-rectangle, keep the original.
    deskewed = _deskew(img)
    if deskewed is not None:
        img = deskewed

    grey = img.convert("L")

    # auto-crop dark/white border
    bright = ImageEnhance.Brightness(grey).enhance(1.2)
    bg = Image.new("L", bright.size, 255)
    diff = ImageOps.invert(ImageChops.difference(bright, bg))
    bbox = diff.getbbox()
    if bbox:
        pad = 20
        w, h = grey.size
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        grey = grey.crop(bbox)

    grey = ImageEnhance.Contrast(grey).enhance(1.6)
    grey = ImageEnhance.Sharpness(grey).enhance(1.8)

    # gentle local normalisation (paper -> white, ink -> near black)
    try:
        import numpy as np
        arr = np.array(grey, dtype=np.float32)
        blur = np.array(grey.filter(ImageFilter.GaussianBlur(radius=40)), dtype=np.float32)
        arr = np.clip(arr - (blur - 200), 0, 255).astype(np.uint8)
        grey = Image.fromarray(arr)
    except Exception:
        # numpy missing — keep the contrast-enhanced grayscale (still a clean scan)
        pass

    grey = ImageEnhance.Contrast(grey).enhance(1.3)

    rw, rh = grey.size
    canvas_w = 800
    scale = (canvas_w * 0.90) / rw
    new_w, new_h = int(rw * scale), int(rh * scale)
    grey = grey.resize((new_w, new_h), Image.LANCZOS)

    canvas_h = max(int(new_h * 1.08), int(canvas_w * 1.414))
    canvas = Image.new("L", (canvas_w, canvas_h), 250)
    canvas.paste(grey, ((canvas_w - new_w) // 2, (canvas_h - new_h) // 2))

    canvas.save(output_path, "PDF", resolution=150)
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: scan_receipt.py input output.pdf", file=sys.stderr)
        sys.exit(2)
    try:
        process(sys.argv[1], sys.argv[2])
    except Exception as e:
        print(f"scan failed: {e}", file=sys.stderr)
        sys.exit(1)
    print(Path(sys.argv[2]).name)
