#!/usr/bin/env python3
"""Generate the VeloGarage icon set: a white bike mark on emerald (#10A37F)."""
from pathlib import Path

from PIL import Image, ImageDraw

SS = 4                      # supersample factor
BASE = 1024
N = BASE * SS
BRAND = (16, 163, 127, 255)  # VeloGarage emerald #10A37F
WHITE = (255, 255, 255, 255)

# Output directory, resolved relative to this file so the script works
# regardless of the current working directory.
ASSETS_DIR = Path(__file__).resolve().parent.parent / "app" / "assets"


def s(v):
    return int(round(v * SS))


def thick_line(d, p1, p2, w, color):
    """Line with round end caps."""
    d.line([s(p1[0]), s(p1[1]), s(p2[0]), s(p2[1])], fill=color, width=s(w))
    r = w / 2
    for p in (p1, p2):
        d.ellipse([s(p[0] - r), s(p[1] - r), s(p[0] + r), s(p[1] + r)], fill=color)


def ring(d, c, R, w, color):
    """Hollow circle (wheel)."""
    d.ellipse([s(c[0] - R), s(c[1] - R), s(c[0] + R), s(c[1] + R)], outline=color, width=s(w))


def draw_bike(color):
    """Draw the bike glyph on a transparent canvas, return cropped RGBA."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    L = (322, 612)   # rear hub
    R = (702, 612)   # front hub
    BB = (516, 612)  # bottom bracket
    SEAT = (430, 356)
    BAR = (642, 356)
    Rw = 150         # wheel radius
    tube = 30        # frame tube width
    wheelw = 34      # wheel ring width

    # wheels
    ring(d, L, Rw, wheelw, color)
    ring(d, R, Rw, wheelw, color)

    # frame
    thick_line(d, BB, SEAT, tube, color)    # seat tube
    thick_line(d, SEAT, BAR, tube, color)   # top tube
    thick_line(d, BB, BAR, tube, color)     # down tube
    thick_line(d, BB, L, tube, color)       # chain stay
    thick_line(d, SEAT, L, tube, color)     # seat stay
    thick_line(d, BAR, R, tube, color)      # fork / head

    # saddle
    thick_line(d, (396, 348), (456, 348), 20, color)
    # handlebar (drop)
    thick_line(d, BAR, (690, 344), 22, color)
    thick_line(d, (690, 344), (690, 384), 22, color)
    # crank + pedal
    d.ellipse([s(BB[0] - 18), s(BB[1] - 18), s(BB[0] + 18), s(BB[1] + 18)], fill=color)
    thick_line(d, BB, (552, 656), 18, color)

    img = img.resize((BASE, BASE), Image.LANCZOS)
    return img.crop(img.getbbox())


def place(glyph, size, frac, bg):
    """Center glyph onto a `size` canvas filling `frac` of the width."""
    canvas = Image.new("RGBA", (size, size), bg)
    target_w = int(size * frac)
    ratio = target_w / glyph.width
    target_h = int(glyph.height * ratio)
    g = glyph.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(g, ((size - target_w) // 2, (size - target_h) // 2))
    return canvas


def main():
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    bike = draw_bike(WHITE)

    # App icon (full-bleed brand square, OS masks corners)
    icon = place(bike, 1024, 0.66, BRAND)
    icon.convert("RGB").save(ASSETS_DIR / "icon.png")

    # Android adaptive foreground (transparent, generous safe-zone padding)
    place(bike, 1024, 0.58, (0, 0, 0, 0)).save(ASSETS_DIR / "adaptive-icon.png")

    # Splash mark (transparent; sits on the brand splash background)
    place(bike, 1024, 0.42, (0, 0, 0, 0)).save(ASSETS_DIR / "splash-icon.png")

    # Convenience size for app-store / Strava developer console upload
    icon.resize((512, 512), Image.LANCZOS).convert("RGB").save(ASSETS_DIR / "app-icon-512.png")

    print(f"icons written to {ASSETS_DIR}")


if __name__ == "__main__":
    main()
