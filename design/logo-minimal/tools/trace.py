"""Trace the elephant from the approved concept (../concept-reference.png) into one SVG path.
pip install potracer pillow numpy; run from this folder -> elephant-traced.json {d, w, h}.

The pack's vector elephant was a loose redraw of the concept (one blobby outline); this follows
the concept itself: round left ear, separate crescent right ear, small eye, J-shaped trunk with
the purple gap between trunk and ear. The eye is a hole, so draw it with fill-rule evenodd."""
import json
import numpy as np, potrace
from PIL import Image, ImageFilter
CROP = (130, 225, 540, 520)  # the large elephant in the concept image
SC = 6                         # trace at 6x so the curves follow the antialiased edge
im = Image.open("../concept-reference.png").convert("L").crop(CROP)
big = im.resize((im.width * SC, im.height * SC), Image.LANCZOS).filter(ImageFilter.GaussianBlur(SC * 0.6))
white = np.array(big) > 160    # white mark vs purple ground
ys, xs = np.where(white)
x0, y0 = xs.min() / SC, ys.min() / SC
w, h = (xs.max() + 1) / SC - x0, (ys.max() + 1) / SC - y0
paths = potrace.Bitmap(~white).trace(turdsize=200, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                                     alphamax=1.0, opticurve=True, opttolerance=0.4)
n = lambda v, o: (f"{v / SC - o:.1f}").rstrip("0").rstrip(".")
d = []
for c in paths:
    d.append(f"M{n(c.start_point.x, x0)} {n(c.start_point.y, y0)}")
    for s in c.segments:
        if s.is_corner:
            d.append(f"L{n(s.c.x, x0)} {n(s.c.y, y0)}L{n(s.end_point.x, x0)} {n(s.end_point.y, y0)}")
        else:
            d.append(f"C{n(s.c1.x, x0)} {n(s.c1.y, y0)} {n(s.c2.x, x0)} {n(s.c2.y, y0)} {n(s.end_point.x, x0)} {n(s.end_point.y, y0)}")
    d.append("Z")
json.dump({"d": "".join(d), "w": round(w, 1), "h": round(h, 1)}, open("elephant-traced.json", "w"))
print("elephant", round(w, 1), "x", round(h, 1), "subpaths", len(paths))
