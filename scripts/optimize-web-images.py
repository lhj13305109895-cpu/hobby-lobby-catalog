from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"


def as_rgb(source: Path) -> Image.Image:
    opened = Image.open(source)
    image = ImageOps.exif_transpose(opened)
    if image.mode == "RGB":
        return image.copy()
    background = Image.new("RGB", image.size, "white")
    if "A" in image.getbands():
        background.paste(image, mask=image.getchannel("A"))
    else:
        background.paste(image.convert("RGB"))
    return background


def optimize_thumbnails() -> tuple[int, int]:
    files = sorted(ASSETS.glob("today-thumb-*.jpg")) + sorted(ASSETS.glob("new-thumb-*.jpg"))
    before = sum(path.stat().st_size for path in files)
    for path in files:
        image = as_rgb(path)
        if max(image.size) <= 560:
            continue
        image.thumbnail((560, 560), Image.Resampling.LANCZOS)
        image.save(path, "JPEG", quality=76, optimize=True, progressive=True, subsampling="4:2:0")
    return before, sum(path.stat().st_size for path in files)


def optimize_uploaded_thumbnails() -> tuple[int, int, int]:
    files = sorted((ASSETS / "uploads").glob("*-thumb.webp"))
    before = sum(path.stat().st_size for path in files)
    for path in files:
        image = as_rgb(path)
        image.thumbnail((560, 560), Image.Resampling.LANCZOS)
        image.save(path, "WEBP", quality=76, method=6)
    return len(files), before, sum(path.stat().st_size for path in files)


def make_webp(
    source_name: str,
    destination_name: str,
    max_side: int,
    quality: int,
    preserve_alpha: bool = False,
) -> tuple[int, int]:
    source = ASSETS / source_name
    destination = ASSETS / destination_name
    if preserve_alpha:
        with Image.open(source) as opened:
            transposed = ImageOps.exif_transpose(opened)
            image = transposed.convert("RGBA" if "A" in transposed.getbands() else "RGB")
    else:
        image = as_rgb(source)
    image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    image.save(destination, "WEBP", quality=quality, method=6)
    return source.stat().st_size, destination.stat().st_size


def main() -> None:
    before, after = optimize_thumbnails()
    print(f"thumbnails: {before / 1024:.0f} KB -> {after / 1024:.0f} KB")
    upload_count, upload_before, upload_after = optimize_uploaded_thumbnails()
    print(f"uploaded thumbnails ({upload_count}): {upload_before / 1024:.0f} KB -> {upload_after / 1024:.0f} KB")
    for source, destination, max_side, quality in [
        ("brand-logo.png", "brand-logo.webp", 256, 82),
        ("today-pattern-02.jpg", "hero-pattern-02.webp", 1000, 80),
        ("today-pattern-09.jpg", "steel-pattern-09.webp", 1000, 80),
        ("hero-reference-products.png", "hero-reference-products.webp", 1560, 82),
    ]:
        old_size, new_size = make_webp(source, destination, max_side, quality)
        print(f"{source}: {old_size / 1024:.0f} KB -> {new_size / 1024:.0f} KB")

    old_size, new_size = make_webp(
        "hero-featured-product.png",
        "hero-featured-product.webp",
        1100,
        84,
        preserve_alpha=True,
    )
    print(f"hero-featured-product.png: {old_size / 1024:.0f} KB -> {new_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
