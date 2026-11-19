"""Resize the approved ImageGen cutouts for local UI assets; retain their alpha."""
import sys
from pathlib import Path
from PIL import Image

target = Path(__file__).resolve().parents[1] / "src/miniprogram/assets/models"
target.mkdir(parents=True, exist_ok=True)
for name, source in zip(["318-12", "318-20", "319-lemon"], sys.argv[1:]):
    with Image.open(source) as original:
        image = original.convert("RGBA")
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        image = image.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        image.save(target / (name + ".png"), optimize=True)
    print(str(target / (name + ".png")))
