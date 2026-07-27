from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
MAX_SIDE = 1600
JPEG_QUALITY = 84


def optimize(source: Path) -> tuple[Path, int, int]:
    destination = source.with_name(f"{source.stem}-display.jpg")
    source_size = source.stat().st_size

    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        if image.mode != "RGB":
            background = Image.new("RGB", image.size, "white")
            if "A" in image.getbands():
                background.paste(image, mask=image.getchannel("A"))
            else:
                background.paste(image.convert("RGB"))
            image = background

        if max(image.size) > MAX_SIDE:
            image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)

        image.save(
            destination,
            "JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
            subsampling="4:2:0",
        )

    return destination, source_size, destination.stat().st_size


def main() -> None:
    total_before = 0
    total_after = 0
    sources = sorted(ASSETS.glob("new-pattern-*.png"))

    for source in sources:
        destination, before, after = optimize(source)
        total_before += before
        total_after += after
        print(f"{source.name} -> {destination.name}: {before / 1024:.1f} KB -> {after / 1024:.1f} KB")

    saved = total_before - total_after
    print(f"Optimized {len(sources)} display images; saved {saved / 1024 / 1024:.2f} MB for lightbox delivery.")


if __name__ == "__main__":
    main()
