import importlib.util
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("prepare_photos", ROOT / "scripts/prepare-miniprogram-photos.py")
photos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photos)


class PhotoPreparationTest(unittest.TestCase):
    def test_portrait_is_centered_using_visible_product_not_blank_canvas(self):
        image = Image.new("RGB", (100, 120), "white")
        image.paste((80, 80, 80), (40, 20, 80, 90))
        x, y, right, bottom = photos.product_bounds(image)
        self.assertEqual((x + right) / 2, 60)
        self.assertEqual((y + bottom) / 2, 55)
        self.assertGreater(x, 0)
        self.assertGreater(y, 0)

    def test_uneven_background_is_not_cropped(self):
        image = Image.new("RGB", (100, 120), "white")
        image.putpixel((0, 0), (0, 0, 0))
        self.assertIsNone(photos.product_bounds(image))


if __name__ == "__main__":
    unittest.main()
