"""Build small phone catalogue images without changing source or detail photos."""
import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = (ROOT / "public").resolve()
LOCAL_THUMBNAILS = (ROOT / "src/miniprogram/assets/catalogue-local").resolve()
DIRECTORY = (PUBLIC / "assets/miniprogram-thumbs").resolve()
MANIFEST = ROOT / "miniprogram/data/thumbnails.js"
VERSION = 1
MAX_SIZE = (360, 360)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--website-assets", type=Path)
    options = parser.parse_args()
    published = set(json.loads(options.website_assets.read_text(encoding="utf-8"))["thumbnails"]) if options.website_assets else None
    products = json.load(sys.stdin)
    previous = {}
    if MANIFEST.exists():
        previous = json.loads(MANIFEST.read_text(encoding="utf-8").removeprefix("module.exports = ").strip().removesuffix(";"))
    if published is None:
        DIRECTORY.mkdir(parents=True, exist_ok=True)
    manifest = {}
    original_bytes = generated_bytes = 0
    for product in products:
        image_path = product.get("thumbnailImage") or product["mainImage"]
        local_prefix = "/assets/catalogue-local/"
        if image_path.startswith(local_prefix):
            local = (LOCAL_THUMBNAILS / image_path.removeprefix(local_prefix)).resolve()
            if not local.is_relative_to(LOCAL_THUMBNAILS):
                raise ValueError("Thumbnail path escapes mini program assets")
            data = local.read_bytes()
            with Image.open(io.BytesIO(data)) as image:
                image.load()
                if image.format != "JPEG" or max(image.size) > max(MAX_SIZE):
                    raise ValueError(f"Invalid mini program thumbnail: {image_path}")
                manifest[product["productId"]] = {"path": image_path, "bytes": len(data), "width": image.width, "height": image.height, "local": True}
            continue
        source = (PUBLIC / image_path.lstrip("/")).resolve()
        if not source.is_relative_to(PUBLIC):
            raise ValueError("Thumbnail path escapes public assets")
        source_data = source.read_bytes()
        original_bytes += len(source_data)
        signature = hashlib.sha256(source_data).hexdigest()
        cached = previous.get(product["productId"], {})
        if cached.get("sourceSha256") == signature and cached.get("version") == VERSION and (published is None or cached.get("path") in published):
            destination = (PUBLIC / cached["path"].lstrip("/")).resolve()
            if destination.is_relative_to(DIRECTORY) and destination.exists() and destination.stat().st_size == cached["bytes"]:
                manifest[product["productId"]] = cached
                generated_bytes += cached["bytes"]
                continue
        with Image.open(io.BytesIO(source_data)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGBA")
            image = Image.alpha_composite(Image.new("RGBA", image.size, "white"), image).convert("RGB")
        original_size = image.size
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, "JPEG", quality=76, optimize=True)
        data = output.getvalue()
        relative = "/assets/miniprogram-thumbs/" + hashlib.sha256(data).hexdigest()[:24] + ".jpg"
        if published is not None and relative not in published:
            manifest[product["productId"]] = {"path": product.get("thumbnailImage") or product["mainImage"], "bytes": len(source_data), "width": original_size[0], "height": original_size[1], "sourceSha256": signature, "version": VERSION, "original": True}
            generated_bytes += len(source_data)
            continue
        destination = PUBLIC / relative.lstrip("/")
        if published is None and (not destination.exists() or destination.read_bytes() != data):
            destination.write_bytes(data)
        manifest[product["productId"]] = {"path": relative, "bytes": len(data), "width": image.width, "height": image.height, "sourceSha256": signature, "version": VERSION}
        generated_bytes += len(data)
    MANIFEST.write_text("module.exports = " + json.dumps(manifest, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(json.dumps({"photos": len(manifest), "before": original_bytes, "after": generated_bytes}))


if __name__ == "__main__":
    main()
