"""Build an OFL font subset for fixed selection-PDF labels and item codes."""
import base64
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tmp/pdf-font-source/packages"))
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = ROOT / "tmp/pdf-font-source/NotoSansSC-variable.ttf"
font = instantiateVariableFont(TTFont(source), {"wght": 400}, inplace=True)
labels = "照片货号容量装箱数量件单价元只选款清单第页共项套装本为参考尚未提交订单，。（）¥"
chars = "".join(chr(n) for n in range(32, 127)) + labels
options = subset.Options()
options.hinting = False
options.recalc_bounds = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=chars)
subsetter.subset(font)
for name_id, value in [(1, "HL Selection Sans"), (2, "Regular"),
                       (3, "HLSelectionSans-Regular"), (4, "HL Selection Sans Regular"),
                       (6, "HLSelectionSans-Regular")]:
    font["name"].setName(value, name_id, 3, 1, 0x409)
buffer = io.BytesIO()
font.save(buffer)
font = TTFont(io.BytesIO(buffer.getvalue()))
scale = 1000 / font["head"].unitsPerEm
cmap = font.getBestCmap()
glyphs = {}
for char in sorted(set(chars)):
    name = cmap.get(ord(char))
    if name is None:
        raise ValueError("Missing PDF font character: " + char)
    glyphs[str(ord(char))] = [font.getGlyphID(name), round(font["hmtx"].metrics[name][0] * scale)]
head = font["head"]
data = {
    "name": "HLSelectionSans-Regular", "glyphs": glyphs,
    "bbox": [round(getattr(head, field) * scale) for field in ["xMin", "yMin", "xMax", "yMax"]],
    "ascent": round(font["hhea"].ascent * scale), "descent": round(font["hhea"].descent * scale),
    "base64": base64.b64encode(buffer.getvalue()).decode("ascii")
}
destination = ROOT / "src/miniprogram/data/pdf-font.js"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text("// Derived from Google Noto Sans SC under SIL OFL 1.1; see vendor/PDF-FONT-LICENSE.txt.\nmodule.exports = " + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")
license_file = ROOT / "src/miniprogram/vendor/PDF-FONT-LICENSE.txt"
license_file.parent.mkdir(parents=True, exist_ok=True)
license_file.write_text("Source: https://github.com/google/fonts/tree/main/ofl/notosanssc\n\n" + (ROOT / "tmp/pdf-font-source/OFL.txt").read_text(encoding="utf-8"), encoding="utf-8")
print(json.dumps({"fontBytes": len(buffer.getvalue()), "characters": len(glyphs), "moduleBytes": destination.stat().st_size}))
