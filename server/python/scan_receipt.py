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


def process(input_path: str, output_path: str) -> str:
    from PIL import Image, ImageOps, ImageEnhance, ImageChops, ImageFilter

    img = Image.open(input_path)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

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
