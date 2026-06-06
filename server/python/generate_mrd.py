#!/usr/bin/env python3
"""
generate_mrd.py — Generate a Missing Receipt Declaration PDF.

Usage: python3 generate_mrd.py job.json
job.json: {
  date, description, vendor, amount, currency, country, accountCode,
  businessReason, userName, generatedDate, generatedTime, outDir
}
Prints (last line): {"mrdPdf": "<path>"}
"""
import sys, os, json, datetime
from pathlib import Path


def load_font(size):
    from PIL import ImageFont
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def load_font_regular(size):
    from PIL import ImageFont
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


BLUE       = (0, 61, 124)   # Macquarie corporate blue
LIGHT_BLUE = (229, 238, 250)
WHITE      = (255, 255, 255)
DARK_TEXT  = (30, 30, 30)
GREY_TEXT  = (90, 90, 90)
BORDER     = (200, 210, 225)


def draw_text_wrapped(draw, text, x, y, max_w, font, fill, line_gap=6):
    """Draw text wrapping at max_w pixels; returns new y after last line."""
    words = text.split()
    line = ""
    lines = []
    for w in words:
        test = (line + " " + w).strip()
        try:
            bbox = font.getbbox(test)
            tw = bbox[2] - bbox[0]
        except Exception:
            tw = len(test) * 8
        if tw <= max_w:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    for ln in lines:
        draw.text((x, y), ln, font=font, fill=fill)
        try:
            h = font.getbbox(ln)[3]
        except Exception:
            h = 16
        y += h + line_gap
    return y


def generate_mrd(job):
    from PIL import Image, ImageDraw

    # Page size: A4 at 96 dpi ≈ 794 × 1123
    W, H = 794, 1123
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    f_title  = load_font(20)
    f_head   = load_font(14)
    f_label  = load_font(12)
    f_value  = load_font_regular(13)
    f_body   = load_font_regular(12)
    f_small  = load_font_regular(11)

    # ── Header bar ──────────────────────────────────────────────────────────
    d.rectangle([(0, 0), (W, 70)], fill=BLUE)
    title = f"Missing Receipt Declaration"
    d.text((24, 12), title, font=f_title, fill=WHITE)
    acct = job.get("accountCode", "")
    desc = job.get("description", "")
    subtitle = f"{acct} : {desc}" if acct else desc
    d.text((24, 42), subtitle[:90], font=f_body, fill=(200, 220, 245))

    # ── Detail table ─────────────────────────────────────────────────────────
    TABLE_X, TABLE_W = 40, W - 80
    y = 94
    LABEL_W = 160
    ROW_H   = 42

    def fmt_date(s):
        try:
            return datetime.datetime.strptime(s, "%Y-%m-%d").strftime("%-d/%-m/%y")
        except Exception:
            return s

    rows = [
        ("Date of Expense",   fmt_date(job.get("date", ""))),
        ("Vendor",            job.get("vendor", job.get("description", ""))),
        ("Amount",            f"{job.get('amount', '')} {job.get('currency', '')}".strip()),
        ("Country",           job.get("country", "")),
        ("Business Reason",   job.get("businessReason", "")),
    ]

    for i, (label, value) in enumerate(rows):
        row_y = y + i * ROW_H
        bg = LIGHT_BLUE if i % 2 == 0 else WHITE
        d.rectangle([(TABLE_X, row_y), (TABLE_X + TABLE_W, row_y + ROW_H - 2)], fill=bg)
        d.rectangle([(TABLE_X, row_y), (TABLE_X + TABLE_W, row_y + ROW_H - 2)], outline=BORDER)
        d.text((TABLE_X + 12, row_y + 10), label, font=f_label, fill=GREY_TEXT)
        d.text((TABLE_X + LABEL_W, row_y + 10), str(value)[:80], font=f_value, fill=DARK_TEXT)

    # ── Certification statement ───────────────────────────────────────────────
    y = y + len(rows) * ROW_H + 36
    CERT = (
        "I certify that one or more of the related tax invoices/receipts applicable "
        "to this expense was either misplaced or unobtainable."
    )
    d.rectangle([(TABLE_X, y), (TABLE_X + TABLE_W, y + 70)], fill=LIGHT_BLUE, outline=BORDER)
    draw_text_wrapped(d, CERT, TABLE_X + 14, y + 12, TABLE_W - 28, f_body, DARK_TEXT)

    # ── Signature block ───────────────────────────────────────────────────────
    y += 90
    user_name   = job.get("userName", "")
    gen_date    = job.get("generatedDate", "")
    gen_time    = job.get("generatedTime", "")

    sig_lines = [
        (user_name, f_head),
        (fmt_date(gen_date) if gen_date else "", f_value),
        (f"{gen_time} Greenwich Mean Time" if gen_time else "", f_small),
    ]
    for text, font in sig_lines:
        if text:
            d.text((TABLE_X, y), text, font=font, fill=DARK_TEXT)
            try:
                y += font.getbbox(text)[3] + 6
            except Exception:
                y += 20

    # ── Footer ────────────────────────────────────────────────────────────────
    d.rectangle([(0, H - 30), (W, H)], fill=BLUE)
    d.text((24, H - 20), "MQ Expense · Missing Receipt Declaration", font=f_small, fill=(200, 220, 245))

    return img


def main():
    job = json.loads(Path(sys.argv[1]).read_text())
    out = Path(job["outDir"])
    img = generate_mrd(job)
    mrd_path = out / "mrd.pdf"
    img.save(str(mrd_path), format="PDF", resolution=96)
    print(json.dumps({"mrdPdf": str(mrd_path)}))


if __name__ == "__main__":
    main()
