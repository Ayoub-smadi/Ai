from __future__ import annotations

import math
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parents[1]
FRAME_DIR = ROOT / "public" / "hero-motion-frames"
OUTPUT = ROOT / "public" / "hero-motion.mp4"
W, H, FPS, DURATION = 960, 720, 30, 15
NAVY = "#020618"
SAGE = "#5f8a72"
MINT = "#dcebe0"
INK = "#17252a"
MUTED = "#758287"
FONT_REG = "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def ar(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt, fill=INK):
    box = draw.textbbox((0, 0), text, font=fnt)
    draw.text(((W - (box[2] - box[0])) / 2, y), text, font=fnt, fill=fill)


def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def leaf(draw, cx, cy, scale=1.0, color=SAGE, angle=0):
    # A simple two-leaf mark built from smooth polygons and lines.
    s = scale
    draw.ellipse((cx - 20*s, cy - 38*s, cx + 8*s, cy + 6*s), fill=color)
    draw.ellipse((cx - 5*s, cy - 25*s, cx + 25*s, cy + 18*s), fill=MINT, outline=color, width=max(1, int(2*s)))
    draw.line((cx - 1*s, cy + 4*s, cx - 1*s, cy + 42*s), fill=INK, width=max(2, int(3*s)))


def draw_icon(draw, scene, cx, cy, pulse):
    r = 72 + int(6 * math.sin(pulse * math.pi * 2))
    draw.ellipse((cx-r, cy-r, cx+r, cy+r), fill="#f5faf6", outline="#cbded0", width=2)
    if scene == 0:
        draw.line((cx, cy + 30, cx, cy - 12), fill=INK, width=7)
        leaf(draw, cx - 4, cy - 14, 1.25)
        draw.arc((cx - 44, cy + 16, cx + 44, cy + 50), 180, 360, fill="#9cb5a3", width=4)
    elif scene == 1:
        draw.rectangle((cx-45, cy-22, cx+45, cy+35), fill="#f1e5d3", outline="#caa87d", width=3)
        for dx in (-25, 0, 25):
            draw.line((cx+dx, cy+35, cx+dx, cy+7), fill=INK, width=3)
            leaf(draw, cx+dx, cy+3, .58)
        draw.ellipse((cx+38, cy-55, cx+70, cy-23), fill="#f4c85e")
    else:
        draw.line((cx, cy + 35, cx-4, cy-12), fill=INK, width=7)
        draw.arc((cx-48, cy-12, cx+42, cy+40), 190, 350, fill="#b7c4c0", width=5)
        leaf(draw, cx-20, cy-12, .9, color="#b0c6b7")
        draw.ellipse((cx-11, cy-18, cx+11, cy+4), outline=SAGE, width=4)
        draw.line((cx-4, cy-33, cx+28, cy-56), fill=SAGE, width=4)
        draw.line((cx+28, cy-56, cx+17, cy-54), fill=SAGE, width=4)
        draw.line((cx+28, cy-56, cx+26, cy-45), fill=SAGE, width=4)


def draw_scene(frame: int):
    t = frame / FPS
    scene = min(2, int(t // 5))
    local = (t - scene * 5) / 5
    ease = 1 - (1 - min(1, local * 1.6)) ** 3
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Subtle grid matching the existing hero card.
    for x in range(0, W, 48):
        draw.line((x, 0, x, H), fill="#0206180b", width=1)
    for y in range(0, H, 48):
        draw.line((0, y, W, y), fill="#0206180b", width=1)

    # Animated orbit and accent strokes.
    cx, cy = W // 2, H // 2 + 12
    for radius, alpha in ((250, 1), (180, 1), (112, 1)):
        draw.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline="#b9cbbf", width=2)
    orbit_angle = t * 0.7 + scene * 0.8
    ox = cx + math.cos(orbit_angle) * 250
    oy = cy + math.sin(orbit_angle) * 180
    draw.ellipse((ox-9, oy-9, ox+9, oy+9), fill=SAGE)

    # Central illustration.
    draw_icon(draw, scene, cx, cy, t)
    badge_y = 90 + int(18 * (1 - ease))
    rounded(draw, (112, badge_y, W-112, badge_y+76), 22, "#ffffff", "#d4e0d7", 2)
    labels = [
        ("عندك مشروع زراعي؟", "خلّينا نبدأه صح"),
        ("عندك حديقة وبدك تزرعها؟", "نختار لك النباتات المناسبة"),
        ("نبتتك تعبانة وبدها معالجة؟", "نعرف السبب ونقترح الحل"),
    ]
    headline, subline = labels[scene]
    centered(draw, ar(headline), badge_y + 8, font(30, True), NAVY)
    centered(draw, ar(subline), badge_y + 46, font(17), SAGE)

    # Supporting icon chips that gently move with the scene.
    chips = [
        [("تخطيط", 120, 540), ("زراعة", 720, 540)],
        [("شمس", 112, 208), ("ماء", 740, 210)],
        [("تشخيص", 108, 520), ("عناية", 735, 520)],
    ][scene]
    for idx, (label, x, y) in enumerate(chips):
        dy = int(7 * math.sin(t * 2 + idx))
        rounded(draw, (x, y + dy, x + 118, y + 48 + dy), 16, "#ffffff", "#d8e5db", 2)
        draw.ellipse((x+14, y+16+dy, x+27, y+29+dy), fill=SAGE if idx == 0 else "#e5be54")
        draw.text((x+38, y+10+dy), ar(label), font=font(15), fill=INK)

    # Progress marker and small brand cue.
    draw.text((40, H-50), "AYOUB AI", font=font(15, True), fill=NAVY)
    draw.text((W-215, H-49), f"0{scene+1} / 03", font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 15), fill=MUTED)
    draw.line((40, H-70, W-40, H-70), fill="#dce6df", width=2)
    draw.line((40, H-70, 40 + int((W-80) * ((frame + 1) / (FPS * DURATION))), H-70), fill=SAGE, width=3)
    return img


def main():
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR)
    FRAME_DIR.mkdir(parents=True)
    total = FPS * DURATION
    for frame in range(total):
        draw_scene(frame).save(FRAME_DIR / f"frame-{frame:04d}.png")
    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(FPS), "-i", str(FRAME_DIR / "frame-%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(OUTPUT)


if __name__ == "__main__":
    main()
