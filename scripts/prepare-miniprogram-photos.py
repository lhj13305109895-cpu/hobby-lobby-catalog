"""Prepare export JPEGs for the website or bundled subpackages; preserve originals."""
import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = (ROOT / "public").resolve()
OUTPUT = (ROOT / "miniprogram").resolve()
JPEG_SIZE = (640, 480)
PACKAGE_LIMIT = 1500 * 1024
PHOTO_VERSION = 1
WEBSITE_PHOTOS = (PUBLIC / "assets/selection-photos").resolve()


def product_bounds(image):
    """Trim only uniform portrait canvas borders; preserve landscape sets."""
    small = image.copy()
    small.thumbnail((360, 360), Image.Resampling.LANCZOS)
    width, height = small.size
    pixels = small.load()
    corners = [pixels[x, y] for x, y in [(0, 0), (width - 1, 0),
                                       (0, height - 1), (width - 1, height - 1)]]
    background = [sum(p[c] for p in corners) / 4 for c in range(3)]
    if any(abs(p[c] - background[c]) > 32 for p in corners for c in range(3)):
        return None
    difference = ImageChops.difference(small, Image.new("RGB", small.size, tuple(round(c) for c in background)))
    red, green, blue = difference.split()
    mask = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(lambda v: 255 if v > 14 else 0)
    raw = mask.tobytes()
    rows = [raw[y * width:(y + 1) * width].count(255) for y in range(height)]
    columns = [raw[x::width].count(255) for x in range(width)]
    ys = [y for y, n in enumerate(rows) if n >= max(2, width * .008)]
    xs = [x for x, n in enumerate(columns) if n >= max(2, height * .008)]
    if not xs or not ys or xs[-1] - xs[0] < width * .18 or ys[-1] - ys[0] < height * .18:
        return None
    padding = max(2, round(max(xs[-1] - xs[0], ys[-1] - ys[0]) * .025))
    return (round(max(0, xs[0] - padding) * image.width / width),
            round(max(0, ys[0] - padding) * image.height / height),
            round(min(width, xs[-1] + padding + 1) * image.width / width),
            round(min(height, ys[-1] + padding + 1) * image.height / height))


def prepare(product):
    original = product.get("originalImage") or product.get("mainImage")
    source = (PUBLIC / original.lstrip("/")).resolve()
    if not source.is_relative_to(PUBLIC):
        raise ValueError("Photo path escapes public assets")
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGBA")
        background = Image.new("RGBA", image.size, "white")
        image = Image.alpha_composite(background, image).convert("RGB")
    if image.width <= image.height and product["categoryId"] != "mixed-set":
        bounds = product_bounds(image)
        if bounds:
            image = image.crop(bounds)
    image.thumbnail((624, 464), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", JPEG_SIZE, "white")
    canvas.paste(image, ((640 - image.width) // 2, (480 - image.height) // 2))
    result = io.BytesIO()
    canvas.save(result, "JPEG", quality=84, optimize=True)
    return result.getvalue()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["local", "website"], default="local")
    options = parser.parse_args()
    products = json.load(sys.stdin)
    manifest, packages = {}, []
    manifest_file = OUTPUT / "data/export-photos.js"
    previous = {}
    if manifest_file.exists():
        previous = json.loads(manifest_file.read_text(encoding="utf-8").removeprefix("module.exports = ").strip().removesuffix(";"))
    WEBSITE_PHOTOS.mkdir(parents=True, exist_ok=True)
    package_bytes = PACKAGE_LIMIT
    for index, product in enumerate(products):
        original = product.get("originalImage") or product.get("mainImage")
        source = (PUBLIC / original.lstrip("/")).resolve()
        if not source.is_relative_to(PUBLIC):
            raise ValueError("Photo path escapes public assets")
        signature = hashlib.sha256(source.read_bytes() + (b"mixed" if product["categoryId"] == "mixed-set" else b"single")).hexdigest()
        cached = previous.get(product["productId"], {})
        content = None
        if cached.get("sourceSha256") == signature and cached.get("version") == PHOTO_VERSION:
            candidate = (PUBLIC / (cached.get("remotePath") or cached["path"]).lstrip("/")).resolve()
            if candidate.is_relative_to(WEBSITE_PHOTOS) and candidate.exists():
                content = candidate.read_bytes()
        if content is None:
            content = prepare(product)
        digest = hashlib.sha256(content).hexdigest()[:24]
        remote_path = "/assets/selection-photos/" + digest + ".jpg"
        remote_file = PUBLIC / remote_path.lstrip("/")
        if not remote_file.exists() or remote_file.read_bytes() != content:
            remote_file.write_bytes(content)
        resource = {"path": remote_path, "remotePath": remote_path, "bytes": len(content), "sourceSha256": signature, "version": PHOTO_VERSION}
        if options.mode == "local" and package_bytes + len(content) > PACKAGE_LIMIT:
            package_root = "export-photos-" + str(len(packages))
            directory = OUTPUT / package_root
            (directory / "images").mkdir(parents=True, exist_ok=True)
            (directory / "index.js").write_text("Page({});\n", encoding="utf-8")
            (directory / "index.json").write_text("{}\n", encoding="utf-8")
            (directory / "index.wxml").write_text("<view></view>\n", encoding="utf-8")
            packages.append({"name": "exportPhotos" + str(len(packages)), "root": package_root, "pages": ["index"]})
            package_bytes = 0
        if options.mode == "local":
            relative = package_root + "/images/photo-" + str(index) + ".jpg"
            destination = OUTPUT / relative
            if not destination.exists() or destination.read_bytes() != content:
                destination.write_bytes(content)
            resource.update({"package": packages[-1]["name"], "path": relative})
            package_bytes += len(content)
        manifest[product["productId"]] = resource
    manifest_file.write_text(
        "module.exports = " + json.dumps(manifest, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(json.dumps({"packages": packages, "photos": len(manifest), "mode": options.mode}))


if __name__ == "__main__":
    main()
