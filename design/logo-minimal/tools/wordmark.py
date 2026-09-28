"""Outline 'MegaDeal' in Fredoka Bold (the site's Fredoka 700) as one SVG path.
usage: wordmark.py SIZE X0 BASELINE TRACK_EM  -> prints JSON {d, width, bbox}"""
import sys, json, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import os
FONT = os.path.join(os.path.dirname(__file__), "../../../public/megadeal/fonts/Fredoka-Bold.ttf")
size, x0, base, track = map(float, sys.argv[1:5])
text = sys.argv[5] if len(sys.argv) > 5 else "MegaDeal"
blob = hb.Blob.from_file_path(FONT); face = hb.Face(blob); font = hb.Font(face)
buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
hb.shape(font, buf, {"kern": True, "liga": True})
tt = TTFont(FONT); gs = tt.getGlyphSet(); order = tt.getGlyphOrder(); upm = tt["head"].unitsPerEm
s = size / upm; pen = SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
bp = BoundsPen(gs)
x = 0.0; n = len(buf.glyph_infos)
for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
    name = order[info.codepoint]
    t = (s, 0, 0, -s, x0 + (x + pos.x_offset) * s, base - pos.y_offset * s)
    gs[name].draw(TransformPen(pen, t)); gs[name].draw(TransformPen(bp, t))
    x += pos.x_advance + (track * upm if i < n - 1 else 0)
print(json.dumps({"d": pen.getCommands(), "advance": x * s, "bbox": bp.bounds}))
