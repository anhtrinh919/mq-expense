#!/usr/bin/env python3
"""Generates a tiny synthetic receipt image fixture for endpoint verification."""
import sys
from PIL import Image, ImageDraw

out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/mqx-fixture.png"
img = Image.new("RGB", (480, 640), "white")
d = ImageDraw.Draw(img)
lines = ["BANGKOK TAXI CO.", "Receipt # 04-19-2261", "19/04/2026  21:14", "", "Fare        1,180.00", "Tip            70.00", "TOTAL  1,250.00 THB", "", "Cash - Thank you"]
y = 40
for ln in lines:
    d.text((40, y), ln, fill="black")
    y += 40
img.save(out)
print(out)
