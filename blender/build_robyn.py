# Robyn for Tide Rush, built in Blender from code.
#   Blender -b -P build_robyn.py -- [--render] [--export]
# Same sizes and joints as src/robyn.js (hips 0.72, head radius 0.235, faces -Z in three.js).
# In Blender she faces -Y; three.js (x, y, z) = Blender (-x, z, y).
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
EXPORT = '--export' in ARGS     # a lighter build for the game: one level less smoothing everywhere
if EXPORT and '--render' in ARGS: sys.exit('render and export in separate runs')
PI = math.pi

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = bpy.data.collections.new('Robyn')
scene.collection.children.link(col)

def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a, b): return max(a, min(b, x))
def sstep(a, b, x):
    t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
def hexrgb(h): return tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4))
def mixc(a, b, t): return tuple(lerp(x, y, t) for x, y in zip(a, b))

# ---------------- materials (names are what the game recolours per outfit) ----------------
def mat(name, hexcol, rough=0.6, vcol=False, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    c = hexrgb(hexcol) + (1,)
    b.inputs['Base Color'].default_value = c
    b.inputs['Roughness'].default_value = rough
    if vcol:
        n = nt.nodes.new('ShaderNodeVertexColor'); n.layer_name = 'Col'
        nt.links.new(n.outputs['Color'], b.inputs['Base Color'])
    if emit:
        b.inputs['Emission Color'].default_value = c
        b.inputs['Emission Strength'].default_value = emit
    m.diffuse_color = c
    return m

OUT = dict(coat='ffc51f', hat='14a39b', boot='e5383b', scarf='e5383b', scarf2='fff1cf')
def shade(h, k): return '%02x%02x%02x' % tuple(int(int(h[i:i + 2], 16) * k) for i in (0, 2, 4))
M = dict(
    Skin=mat('Skin', 'f7c9a6', 0.62, vcol=True),
    SkinPlain=mat('SkinPlain', 'f7c9a6', 0.62),
    SkinDark=mat('SkinDark', 'eeb190', 0.62),
    Nose=mat('Nose', 'f2b49b', 0.55),
    Hair=mat('Hair', '3a241a', 0.5, vcol=True),
    Leg=mat('Leggings', '24375e', 0.8),
    Navy=mat('Navy', '24375e', 0.35),
    Gold=mat('Gold', 'f2c14e', 0.3),
    Sole=mat('Sole', 'fff1cf', 0.6),
    Coat=mat('Coat', OUT['coat'], 0.3), CoatDark=mat('CoatDark', shade(OUT['coat'], 0.8), 0.35),
    CoatInside=mat('CoatInside', shade(OUT['coat'], 0.42), 0.6),
    Hat=mat('Hat', OUT['hat'], 0.75), HatDark=mat('HatDark', shade(OUT['hat'], 0.78), 0.8),
    Boot=mat('Boot', OUT['boot'], 0.2), BootDark=mat('BootDark', shade(OUT['boot'], 0.78), 0.25),
    Scarf=mat('Scarf', OUT['scarf'], 0.85), Scarf2=mat('Scarf2', OUT['scarf2'], 0.85),
    # face
    Sclera=mat('EyeWhite', 'fffdf9', 0.3, emit=0.1),
    IrisRim=mat('IrisRim', '3d5874', 0.25),
    Iris=mat('Iris', '7197b4', 0.25, emit=0.08),
    IrisLight=mat('IrisLight', 'a9c8dc', 0.25, emit=0.15),
    Pupil=mat('Pupil', '19212d', 0.2),
    Shine=mat('Shine', 'ffffff', 0.1, emit=1.0),
    Ink=mat('Ink', '35201a', 0.5),
    Crease=mat('Crease', 'c98a72', 0.6),
    Brow=mat('Brow', '2a1810', 0.6),
    Mouth=mat('Mouth', '8c2a34', 0.5),
    MouthDeep=mat('MouthDeep', '5a1820', 0.5),
    Teeth=mat('Teeth', 'fffaf2', 0.3),
    Tongue=mat('Tongue', 'f2828e', 0.45),
)

def link(ob):
    col.objects.link(ob)
    return ob

def finish(name, bm, material=None, smooth=True, subsurf=0, vcols=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    mats = material if isinstance(material, (list, tuple)) else [material] if material else []
    for m in mats:
        me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if vcols is not None:
        ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'POINT')
        for i, c in enumerate(vcols):
            ca.data[i].color = (c[0], c[1], c[2], 1)
    if EXPORT and subsurf: subsurf -= 1
    if subsurf:
        md = ob.modifiers.new('Subsurf', 'SUBSURF'); md.levels = md.render_levels = subsurf
    return ob

def outward(bm, centre):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

# lathe around the vertical axis through `at`; profile rows are (width, depth, z) or (radius, z)
def lathe(name, prof, material, at=(0, 0, 0), seg=32, shape=None, cap=(True, True), subsurf=1):
    bm = bmesh.new()
    rows = []
    for k, p in enumerate(prof):
        w, d, z = (p[0], p[0], p[1]) if len(p) == 2 else p
        t = k / (len(prof) - 1)
        row = []
        for i in range(seg):
            a = 2 * PI * i / seg
            s = shape(a, t) if shape else 1
            row.append(bm.verts.new(Vector(at) + Vector((w * s * math.sin(a), -d * s * math.cos(a), z))))
        rows.append(row)
    for k in range(len(rows) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((rows[k][i], rows[k][j], rows[k + 1][j], rows[k + 1][i]))
    if cap[0] and prof[0][0] > 0: bm.faces.new(list(reversed(rows[0])))
    if cap[1] and prof[-1][0] > 0: bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, material, subsurf=subsurf)

def ball(name, c, r, material, seg=24, rings=16, warp=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1)
    for v in bm.verts:
        p = Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2]))
        if warp: p = warp(p)
        v.co = p + Vector(c)
    return finish(name, bm, material)

# a tube along pts; widths per point; `up` (per point or one vector) sets which way is "deep" for flat tubes
def tube(name, pts, widths, material, seg=12, deep=1.0, ups=None, cap=True, subsurf=1, mat_fn=None, shape=None, vcol_fn=None):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    if not isinstance(widths, (list, tuple)): widths = [widths] * n
    bm = bmesh.new()
    rows, cols = [], []
    for k in range(n):
        t = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
        up = Vector(ups[k] if isinstance(ups, list) else ups) if ups is not None else (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((0, -1, 0)))
        nn = (up - t * up.dot(t)).normalized()
        b = t.cross(nn).normalized()
        row = []
        for i in range(seg):
            a = 2 * PI * i / seg
            s = shape(a) if shape else 1
            row.append(bm.verts.new(pts[k] + b * (widths[k] * s * math.cos(a)) + nn * (widths[k] * deep * s * math.sin(a))))
            if vcol_fn: cols.append(vcol_fn(k / (n - 1), a))
        rows.append(row)
    for k in range(n - 1):
        for i in range(seg):
            j = (i + 1) % seg
            f = bm.faces.new((rows[k][i], rows[k][j], rows[k + 1][j], rows[k + 1][i]))
            if mat_fn: f.material_index = mat_fn((k + 0.5) / (n - 1))
    if cap:
        f0 = bm.faces.new(rows[0]); f1 = bm.faces.new(list(reversed(rows[-1])))
        if mat_fn: f0.material_index = mat_fn(0); f1.material_index = mat_fn(1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, material, subsurf=subsurf, vcols=cols if vcol_fn else None)

def torus(name, c, axis, R, r, material, U=64, V=12, shape=None, tall=1.0, subsurf=1, mat_fn=None):
    bm = bmesh.new()
    q = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized())
    grid = []
    for i in range(U):
        u = 2 * PI * i / U
        s = shape(u) if shape else 1
        row = []
        for j in range(V):
            v = 2 * PI * j / V
            rr = R + r * s * math.cos(v)
            row.append(bm.verts.new(Vector(c) + q @ Vector((rr * math.cos(u), rr * math.sin(u), r * s * tall * math.sin(v)))))
        grid.append(row)
    for i in range(U):
        for j in range(V):
            f = bm.faces.new((grid[i][j], grid[(i + 1) % U][j], grid[(i + 1) % U][(j + 1) % V], grid[i][(j + 1) % V]))
            if mat_fn: f.material_index = mat_fn((i + 0.5) / U)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return finish(name, bm, material, subsurf=subsurf)

# ---------------- body layout (Blender coords) ----------------
HIP = 0.72
HEAD = 0.235
HC = Vector((0, 0, HIP + 0.745))   # head centre

def head_pt(d, k=HEAD):
    """The game's headShape(): a ball a little wider than tall, with full cheeks and a small chin. d: Blender direction."""
    d = Vector(d).normalized()
    x3, y3, z3 = -d.x, d.z, d.y
    cheek = lambda sx: math.exp(-((x3 - sx * 0.6) ** 2 + (y3 + 0.42) ** 2 + (z3 + 0.68) ** 2) / 0.2)
    r = k * (1 + 0.06 * (cheek(1) + cheek(-1)) + 0.03 * math.exp(-(x3 * x3 + (y3 + 0.86) ** 2 + (z3 + 0.5) ** 2) / 0.12))
    return HC + Vector((d.x * r * 1.06, d.y * r, d.z * r * 0.98))

def head_n(d):
    d = Vector(d).normalized()
    p = head_pt(d) - HC
    return Vector((p.x / 1.06 ** 2, p.y, p.z / 0.98 ** 2)).normalized()

def face_dir(fx, fy):
    return Vector((fx, -math.sqrt(max(0.0, 1 - fx * fx - fy * fy)), fy))

def face_pt(fx, fy, off=0.0):
    d = face_dir(fx, fy)
    return head_pt(d) + head_n(d) * off, head_n(d)

def sph(az, el):
    a, e = math.radians(az), math.radians(el)
    return Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))

# ---------------- 2D helpers for the face ----------------
def clip_poly(subject, clipper):
    """Sutherland-Hodgman: clip polygon `subject` by convex polygon `clipper` (both CCW lists of (x, y))."""
    def inside(p, a, b): return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0
    def inter(p, q, a, b):
        x1, y1, x2, y2, x3, y3, x4, y4 = *p, *q, *a, *b
        den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
        return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))
    out = subject
    for i in range(len(clipper)):
        a, b = clipper[i], clipper[(i + 1) % len(clipper)]
        inp, out = out, []
        if not inp: break
        s = inp[-1]
        for e in inp:
            if inside(e, a, b):
                if not inside(s, a, b): out.append(inter(s, e, a, b))
                out.append(e)
            elif inside(s, a, b):
                out.append(inter(s, e, a, b))
            s = e
    return out

def ellipse(cx, cy, rx, ry, n=48):
    return [(cx + rx * math.cos(2 * PI * i / n), cy + ry * math.sin(2 * PI * i / n)) for i in range(n)]

def resample(poly, n=64):
    # even spacing round a closed polygon, so the decal rings are tidy
    L = [0]
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        L.append(L[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    out, j = [], 0
    for k in range(n):
        s = L[-1] * k / n
        while L[j + 1] < s: j += 1
        a, b = poly[j], poly[(j + 1) % len(poly)]
        t = (s - L[j]) / max(L[j + 1] - L[j], 1e-9)
        out.append((lerp(a[0], b[0], t), lerp(a[1], b[1], t)))
    return out

def decal(name, poly, material, top, base, rings=3, ramp=0.3):
    """A thin flat-topped patch hugging the face: its rim sits at `base` above the skin, its top at `top`."""
    if len(poly) < 3: return None
    poly = resample(poly, 40)
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    bm = bmesh.new()
    centre = bm.verts.new(face_pt(cx, cy, top)[0])
    rows = []
    for k in range(1, rings + 1):
        t = k / rings
        h = lerp(base, top, sstep(1.0, 1.0 - ramp, t))
        rows.append([bm.verts.new(face_pt(cx + (x - cx) * t, cy + (y - cy) * t, h)[0]) for x, y in poly])
    n = len(poly)
    for i in range(n):
        bm.faces.new((centre, rows[0][i], rows[0][(i + 1) % n]))
    for k in range(len(rows) - 1):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((rows[k][i], rows[k + 1][i], rows[k + 1][j], rows[k][j]))
    ob = finish(name, bm, material)
    me = ob.data
    p0 = me.polygons[0]
    if p0.normal.dot(p0.center - HC) < 0: me.flip_normals()
    return ob

def face_line(name, pts2, widths, material, off, deep=0.5, seg=8):
    pts, ups = [], []
    for x, y in pts2:
        p, n = face_pt(x, y, off)
        pts.append(p); ups.append(n)
    return tube(name, pts, widths, material, seg=seg, deep=deep, ups=ups, subsurf=0)

def bez2(p0, c, p1, n=16):
    return [((1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * c[1] + t * t * p1[1]) for t in (i / n for i in range(n + 1))]
def bez3(p0, c1, c2, p1, n=24):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append(tuple(u ** 3 * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t ** 3 * p1[k] for k in (0, 1)))
    return out

def region_sheet(name, bbox, step, classify, mats, off):
    """A sheet of small squares on the face; classify(x, y) picks each square's material (or None to leave it out)."""
    x0, y0, x1, y1 = bbox
    nx, ny = int((x1 - x0) / step) + 1, int((y1 - y0) / step) + 1
    bm = bmesh.new()
    V = {}
    def vert(i, j):
        if (i, j) not in V:
            V[(i, j)] = bm.verts.new(face_pt(x0 + i * step, y0 + j * step, off)[0])
        return V[(i, j)]
    for i in range(nx):
        for j in range(ny):
            c = classify(x0 + (i + 0.5) * step, y0 + (j + 0.5) * step)
            if c is None: continue
            f = bm.faces.new((vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)))
            f.material_index = c
    ob = finish(name, bm, mats, smooth=True)
    me = ob.data
    if me.polygons and me.polygons[0].normal.dot(me.polygons[0].center - HC) < 0: me.flip_normals()
    return ob

def in_poly(x, y, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c

# ================= HEAD =================
head_objs = []

# skin, with rosy cheeks painted into the vertex colours (soft, no hard edge)
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=64 if EXPORT else 72, v_segments=40 if EXPORT else 48, radius=1)
cols = []
SKIN, BLUSH = hexrgb('f7c9a6'), hexrgb('f28f8f')
for v in bm.verts:
    d = v.co.normalized()
    v.co = head_pt(d)
    b = 0.0
    for sx in (-1, 1):
        cx, cy = sx * 0.6, -0.33
        if d.y < 0:
            b = max(b, math.exp(-((d.x - cx) ** 2 / 0.028 + (d.z - cy) ** 2 / 0.018)))
    cols.append(mixc(SKIN, BLUSH, 0.62 * b))
skin = finish('Head', bm, M['Skin'], vcols=cols)
head_objs.append(skin)
for sx in (-1, 1):
    head_objs.append(ball(f'Ear.{sx}', HC + Vector((sx * 0.243, 0.02, -0.05)), (0.021, 0.034, 0.036), M['SkinPlain'], 12, 10))
    head_objs.append(ball(f'EarIn.{sx}', HC + Vector((sx * 0.252, 0.014, -0.052)), (0.0096, 0.02, 0.027), M['SkinDark'], 10, 8))
# small rounded nose, low between the eyes
np_, nn_ = face_pt(0, -0.21, 0.0)
head_objs.append(ball('Nose', np_ + nn_ * 0.004, (0.028, 0.02, 0.019), M['Nose'], 16, 12))

# ---------- faces: happy, blink, shocked ----------
FACES = {}
def eye_outline(ex, ey, rx, ry, sx, tilt=0.09):
    """Almond: fuller on top, pointed corners, the outer corner tipped up."""
    pts = []
    for i in range(64):
        t = 2 * PI * i / 64
        s = math.sin(t)
        x = rx * math.cos(t)
        y = (ry if s > 0 else ry * 0.78) * s * (0.62 + 0.38 * abs(s))
        y += sx * tilt * x
        pts.append((ex + x, ey + y))
    return pts

def happy_eye(tag, sx, objs, wide=False):
    ex, ey = sx * 0.385, -0.07
    if wide:
        rx, ry, ir = 0.15, 0.19, 0.088
        outline = ellipse(ex, ey, rx, ry, 64)
        objs.append(decal(f'{tag}EyeRing.{sx}', ellipse(ex, ey, rx + 0.016, ry + 0.016, 64), M['Ink'], 0.0016, -0.0004))
    else:
        rx, ry, ir = 0.135, 0.13, 0.102
        outline = eye_outline(ex, ey, rx, ry, sx)
    objs.append(decal(f'{tag}Sclera.{sx}', outline, M['Sclera'], 0.0022, 0.0006))
    ix, iy = ex - sx * 0.008, ey - (0.0 if wide else 0.012)
    L = [(f'{tag}IrisRim', ellipse(ix, iy, ir, ir), M['IrisRim'], 0.0028),
         (f'{tag}Iris', ellipse(ix, iy, ir * 0.86, ir * 0.86), M['Iris'], 0.0032),
         (f'{tag}IrisLight', ellipse(ix, iy - ir * 0.32, ir * 0.55, ir * 0.42), M['IrisLight'], 0.0035),
         (f'{tag}Pupil', ellipse(ix, iy, ir * 0.48, ir * 0.48), M['Pupil'], 0.0039)]
    prev = 0.0022
    for nm, poly, m, top in L:
        objs.append(decal(f'{nm}.{sx}', clip_poly(poly, outline), m, top, prev - 0.0003))
        prev = top
    cr = 0.03 if wide else 0.042
    objs.append(decal(f'{tag}Shine.{sx}', clip_poly(ellipse(ix + 0.045, iy + 0.05, cr, cr), outline), M['Shine'], 0.0046, 0.0036))
    objs.append(decal(f'{tag}Shine2.{sx}', clip_poly(ellipse(ix - 0.05, iy - 0.06, 0.018, 0.018), outline), M['Shine'], 0.0046, 0.0036))
    if not wide:
        # upper lid: a strong line over the top, thickest in the middle, with two lashes at the outer corner
        top = [p for p in eye_outline(ex, ey, rx + 0.006, ry + 0.008, sx) if p[1] >= ey + sx * 0.09 * (p[0] - ex) - 0.004]
        top.sort(key=lambda p: p[0] * sx)
        n = len(top)
        objs.append(face_line(f'{tag}Lid.{sx}', top, [0.0014 + 0.0026 * math.sin(PI * (0.15 + 0.85 * i / (n - 1))) for i in range(n)], M['Ink'], 0.0024, deep=0.45))
        ox, oy = top[-1]
        for k, (dx, dy) in enumerate(((0.06, 0.035), (0.045, 0.06))):
            sx0, sy0 = ox - sx * k * 0.03, oy + k * 0.012
            objs.append(face_line(f'{tag}Lash{k}.{sx}', [(sx0, sy0), (sx0 + sx * dx * 0.5, sy0 + dy * 0.55), (sx0 + sx * dx, sy0 + dy)], [0.0026, 0.0018, 0.0006], M['Ink'], 0.0024, deep=0.5, seg=6))
        # a soft crease under the eye
        bot = [(ex + 0.11 * math.cos(a), ey - 0.125 * math.sin(a) * 0.95 + sx * 0.09 * 0.11 * math.cos(a)) for a in [PI * (0.3 + 0.4 * i / 10) for i in range(11)]]
        objs.append(face_line(f'{tag}Under.{sx}', bot, [0.0006, 0.0011, 0.0011, 0.0011, 0.0011, 0.0011, 0.0011, 0.0011, 0.0011, 0.0011, 0.0006], M['Crease'], 0.001, deep=0.4, seg=6))

def brows(tag, objs, lift=0.0):
    for sx in (-1, 1):
        bx, by = sx * 0.38, 0.2 + lift
        pts = bez2((bx - sx * 0.1, by - 0.012), (bx + sx * 0.01, by + 0.035), (bx + sx * 0.115, by - 0.018), 10)
        objs.append(face_line(f'{tag}Brow.{sx}', pts, [0.0035 + 0.003 * math.sin(PI * i / 10) for i in range(11)], M['Brow'], 0.0015, deep=0.45))

def strip(name, top, bot, material, off, rows=3):
    """A band on the face between two matching rows of points."""
    bm = bmesh.new()
    R = []
    for k in range(rows + 1):
        t = k / rows
        R.append([bm.verts.new(face_pt(lerp(a[0], b[0], t), lerp(a[1], b[1], t), off)[0]) for a, b in zip(top, bot)])
    for k in range(rows):
        for i in range(len(top) - 1):
            bm.faces.new((R[k][i], R[k][i + 1], R[k + 1][i + 1], R[k + 1][i]))
    ob = finish(name, bm, material)
    me = ob.data
    if me.polygons[0].normal.dot(me.polygons[0].center - HC) < 0: me.flip_normals()
    return ob

def happy_mouth(tag, objs):
    # a big, broad open smile (from the photos): a row of top teeth, tongue below
    m = lambda dx, dy: (dx, -0.44 - dy)
    top = bez2(m(-0.25, -0.035), m(0, 0.05), m(0.25, -0.035), 24)
    bot = bez3(m(0.25, -0.035), m(0.21, 0.25), m(-0.21, 0.25), m(-0.25, -0.035), 28)
    outline = top[:-1] + bot[:-1]
    objs.append(decal(f'{tag}Mouth', outline, M['Mouth'], 0.0011, 0.0003))
    inner = [(x, y - 0.006 * (1 - (x / 0.25) ** 2)) for x, y in top]
    teeth_bot = [(x, y - 0.072 * max(0, 1 - (x / 0.25) ** 2) ** 0.7) for x, y in top]
    objs.append(strip(f'{tag}Teeth', inner, teeth_bot, M['Teeth'], 0.0016))
    objs.append(decal(f'{tag}Tongue', clip_poly(ellipse(0, -0.44 - 0.19, 0.13, 0.07), list(reversed(bot))), M['Tongue'], 0.0016, 0.0008))
    objs.append(face_line(f'{tag}Lip', outline + [outline[0]], 0.0023, M['MouthDeep'], 0.0016, deep=0.4, seg=6))
    for sx in (-1, 1):   # little dimples at the corners
        objs.append(face_line(f'{tag}Dimple.{sx}', [m(sx * 0.275, -0.075), m(sx * 0.295, -0.035), m(sx * 0.27, 0.01)], [0.0008, 0.0016, 0.0007], M['Crease'], 0.0012, deep=0.4, seg=6))

def shock_mouth(objs):
    o = ellipse(0, -0.55, 0.105, 0.135, 40)
    objs.append(decal('ShockMouth', o, M['Mouth'], 0.0011, 0.0003))
    objs.append(decal('ShockTeeth', clip_poly([(-0.2, -0.55 + 0.095), (0.2, -0.55 + 0.095), (0.2, -0.3), (-0.2, -0.3)], o), M['Teeth'], 0.0016, 0.0008))
    objs.append(decal('ShockTongue', clip_poly(ellipse(0, -0.65, 0.08, 0.06), o), M['Tongue'], 0.0016, 0.0008))
    objs.append(face_line('ShockLip', o + [o[0]], 0.003, M['MouthDeep'], 0.0016, deep=0.4, seg=6))

def build_face(kind):
    objs = []
    if kind == 'blink':
        for sx in (-1, 1):
            ex, ey = sx * 0.385, -0.07
            arc = [(ex + 0.14 * math.cos(a), ey + 0.04 - 0.085 * math.sin(a) + sx * 0.09 * 0.14 * math.cos(a)) for a in [PI * (0.06 + 0.88 * i / 16) for i in range(17)]]
            objs.append(face_line(f'BlinkLid.{sx}', arc, [0.0012] + [0.0034] * 15 + [0.0012], M['Ink'], 0.0016, deep=0.45))
            o = arc[0] if sx > 0 else arc[-1]
            for k, (dx, dy) in enumerate(((0.05, 0.02), (0.035, 0.045))):
                objs.append(face_line(f'BlinkLash{k}.{sx}', [o, (o[0] + sx * dx, o[1] + dy - k * 0.01)], [0.0022, 0.0006], M['Ink'], 0.0016, deep=0.5, seg=6))
    elif kind == 'shock':
        for sx in (-1, 1): happy_eye('Shock', sx, objs, wide=True)
        brows('Shock', objs, lift=-0.03)
        shock_mouth(objs)
    elif kind == 'smile':
        happy_mouth('Smile', objs)
    else:
        for sx in (-1, 1): happy_eye('Happy', sx, objs)
    return [o for o in objs if o]

# the game shows happy or blink eyes with the smile, or the whole shocked face
for kind in ('happy', 'blink', 'smile', 'shock'):
    FACES[kind] = build_face(kind)

# ---------- hair: very dark brown, combed back to a LOW ponytail at the nape, with a thick blunt fringe ----------
HAIR, HAIR_D, HAIR_L = hexrgb('2f1c13'), hexrgb('1a0f09'), hexrgb('5c3b29')
P = Vector((0, 0.8, -0.6)).normalized()        # where the ponytail is gathered: low at the back of her head
U = Vector((0, 0.6, 0.8)).normalized()          # over the top
Vv = Vector((1, 0, 0))
def hdir(a, q): return (P * math.cos(q) + (U * math.cos(a) + Vv * math.sin(a)) * math.sin(q)).normalized()
def hairline(d):
    phi = math.atan2(abs(d.x), -d.y)          # 0 at the middle of her face, PI at the back
    if phi < 0.9: return 0.32
    if phi < 1.25: return lerp(0.32, -0.04, sstep(0.9, 1.25, phi))
    if phi < 1.62: return -0.04
    return lerp(-0.04, -0.8, sstep(1.62, 2.0, phi))
STRANDS = 30
NU, NV = 144, 22
Q = []
for i in range(NU):
    a = 2 * PI * i / NU
    q = 0.2
    while q < PI - 0.004:
        if hdir(a, q).z < hairline(hdir(a, q)): break
        q += 0.004
    Q.append(q)
bm = bmesh.new()
grid, cols = [], []
for i in range(NU):
    a = 2 * PI * i / NU
    ridge = math.cos(a * STRANDS)
    row = []
    for j in range(NV + 1):
        tuck = j == NV
        t = min(j / (NV - 1), 1)
        q = lerp(0.2, Q[i], t) + (0.03 if tuck else 0)
        d = hdir(a, q)
        lift = 0.985 if tuck else 1.075 + 0.012 * ridge * sstep(0.35, 0.9, q)
        row.append(bm.verts.new(head_pt(d, HEAD * lift)))
        shine = sstep(0.55, 0.72, d.z) * sstep(0.95, 0.82, d.z) * (0.6 + 0.4 * sstep(0.2, -0.4, d.y))
        c = mixc(HAIR_D, HAIR, 0.5 + 0.5 * ridge)
        cols.append(mixc(c, HAIR_L, shine * (0.45 + 0.35 * ridge)))
    grid.append(row)
for i in range(NU):
    for j in range(NV):
        bm.faces.new((grid[i][j], grid[(i + 1) % NU][j], grid[(i + 1) % NU][j + 1], grid[i][j + 1]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
cap = finish('HairCap', bm, M['Hair'], vcols=cols)
head_objs.append(cap)

# the fringe: a thick, blunt, straight-cut fringe that comes down to her eyebrows, a little rounded at the sides
bm = bmesh.new()
NA, NE = 72, 18
A0 = 74
rows, cols = [], []
def fringe_bottom(az):  # elevation (degrees) of the cut edge
    u = az / A0
    return math.degrees(math.asin(0.13)) - 26 * u ** 4 - 1.1 * (0.5 + 0.5 * math.cos(math.radians(az) * 17)) ** 6  # blunt, with a few soft clumps
for i in range(NA + 1):
    az = -A0 + 2 * A0 * i / NA
    ridge = math.cos(math.radians(az) * 24)
    top_el = 84 - 14 * (az / A0) ** 2   # starts under the cap near the crown, so there's no ledge
    bot = fringe_bottom(az)
    side = sstep(0.75, 1.0, abs(az) / A0)
    loop = []
    # outer surface from the crown down, then round the cut edge, then back up the inside
    prof = []
    for k in range(NE + 1):
        t = k / NE
        prof.append((lerp(top_el, bot, t), 1.055 + (0.048 * sstep(0.0, 0.45, t) + 0.005 * ridge * sstep(0.2, 0.7, t)) * (1 - side) + 0.008 * (1 - side) * math.sin(PI * t)))
    for a in (0.35, 0.7):     # rounded lip at the cut
        prof.append((bot - 1.5 * math.sin(a * PI) * (1 - side), lerp(1.095, 1.04, a) * (1 - side) + 1.07 * side))
    for k in range(6):
        t = k / 5
        prof.append((lerp(bot + 2, top_el + 4, t), lerp(1.04, 1.06, t) * (1 - side) + 1.07 * side))
    row = []
    for el, lift in prof:
        d = sph(az, el)
        row.append(bm.verts.new(head_pt(d, HEAD * lift)))
        shine = sstep(52, 64, el) * sstep(76, 66, el)
        c = mixc(HAIR_D, HAIR, 0.55 + 0.45 * ridge)
        cols.append(mixc(c, HAIR_L, shine * (0.4 + 0.3 * ridge)))
    rows.append(row)
for i in range(NA):
    for k in range(len(rows[0]) - 1):
        bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
fringe = finish('Fringe', bm, M['Hair'], vcols=cols, subsurf=1)
head_objs.append(fringe)
# soft wisps in front of each ear
for sx in (-1, 1):
    pts = [head_pt(sph(sx * (az), el), HEAD * 1.07) for az, el in ((74, 10), (77, -8), (75, -26), (71, -38))]
    head_objs.append(tube(f'Wisp.{sx}', pts, [0.022, 0.02, 0.014, 0.004], M['Hair'], seg=8, deep=0.5, ups=[head_n(p - HC) for p in pts],
                          vcol_fn=lambda t, a: mixc(HAIR_D, HAIR, 0.5 + 0.5 * math.cos(a * 3))))

# where the hair is gathered at the nape, and the teal scrunchie (smooth, gently ruffled)
gat = lambda k: HC + Vector((P.x * 1.0, P.y * 1.0, P.z * 0.98)) * HEAD * k
head_objs.append(tube('Gather', [gat(0.9), gat(1.32)], [0.075, 0.064], M['Hair'], seg=16, shape=lambda a: 1 + 0.06 * math.cos(a * 6),
                      vcol_fn=lambda t, a: mixc(HAIR_D, HAIR, 0.5 + 0.5 * math.cos(a * 6))))
head_objs.append(torus('Scrunchie', gat(1.2), P, 0.068, 0.03, M['Hat'], U=60 if EXPORT else 84, V=12 if EXPORT else 16, shape=lambda u: 1 + 0.08 * math.cos(u * 7), subsurf=1))
head_objs.append(torus('ScrunchieIn', gat(1.2), P, 0.068, 0.019, M['HatDark'], U=60 if EXPORT else 84, V=8, tall=2.0, shape=lambda u: 1 - 0.06 * math.cos(u * 7), subsurf=1))

# the ponytail (a separate piece so the game can swing it): from the scrunchie down her back
PONY_AT = gat(1.3)
def ponytail(pose=0.0):
    # pose: 0 hangs down her back
    pts = []
    for k, (dz, dy) in enumerate(((0, 0), (-0.06, 0.035), (-0.15, 0.05), (-0.25, 0.05), (-0.32, 0.035), (-0.37, 0.005), (-0.39, -0.02))):
        pts.append(PONY_AT + Vector((0, dy, dz)))
    return tube('Ponytail', pts, [0.058, 0.07, 0.074, 0.068, 0.055, 0.035, 0.01], M['Hair'], seg=18, ups=Vector((0, 1, 0)),
                shape=lambda a: 1 + 0.07 * math.cos(a * 5), subsurf=1,
                vcol_fn=lambda t, a: mixc(mixc(HAIR_D, HAIR, 0.5 + 0.5 * math.cos(a * 5)), HAIR_L, 0.25 * max(0, math.sin(a))))
pony = ponytail()

# ================= TORSO =================
torso_objs = []
H0 = HIP
CH = [(0.193, 0.183, 0.1), (0.196, 0.18, 0.19), (0.2, 0.172, 0.29), (0.192, 0.158, 0.37), (0.155, 0.135, 0.425), (0.1, 0.095, 0.462), (0.0, 0.0, 0.48)]
torso_objs.append(lathe('Coat', [(w, d, H0 + z) for w, d, z in CH], M['Coat'], seg=40, subsurf=2))
def coat_front(z, x=0.0):
    z -= H0
    for (w0, d0, z0), (w1, d1, z1) in zip(CH, CH[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            w, d = lerp(w0, w1, t), lerp(d0, d1, t)
            return -d * math.sqrt(max(0, 1 - (x / w) ** 2))
    return -CH[0][1]
pl = [(0, coat_front(H0 + z) - 0.004, H0 + z) for z in (0.12, 0.2, 0.29, 0.37, 0.43)]
torso_objs.append(tube('Placket', pl, 0.03, M['CoatDark'], seg=10, deep=0.25, ups=Vector((0, -1, 0))))
for k, z in enumerate((0.215, 0.335)):
    torso_objs.append(ball(f'Button.{k}', (0, coat_front(H0 + z) - 0.012, H0 + z), (0.021, 0.011, 0.021), M['Navy'], 16, 10))
torso_objs.append(lathe('Belt', [(0.186, 0.175, H0 + 0.08), (0.2, 0.19, H0 + 0.086), (0.205, 0.194, H0 + 0.11), (0.2, 0.19, H0 + 0.134), (0.186, 0.175, H0 + 0.14)], M['Navy'], seg=40, cap=(False, False)))
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
bk = finish('Buckle', bm, M['Gold'], subsurf=2); bk.scale = (0.08, 0.026, 0.064); bk.location = (0, -0.198, H0 + 0.11)
torso_objs.append(bk)
torso_objs.append(ball('BuckleIn', (0, -0.211, H0 + 0.11), (0.022, 0.006, 0.014), M['Navy'], 12, 8))
torso_objs.append(lathe('Neck', [(0.075, H0 + 0.45), (0.082, H0 + 0.55)], M['SkinDark'], seg=16, subsurf=0))
# scarf wound round her neck with crisp stripes, knotted at the front, a short end hanging down her coat
SZ = H0 + 0.518
torso_objs.append(torus('ScarfRing', (0, 0.004, SZ), (0, 0, 1), 0.127, 0.054, [M['Scarf'], M['Scarf2']], U=72 if EXPORT else 96, V=12 if EXPORT else 14, tall=0.8, shape=lambda u: 1 + 0.07 * math.cos(3 * u) + 0.03 * math.cos(7 * u),
                        mat_fn=lambda u: int(u * 12 + 0.5) % 2))
torso_objs.append(ball('ScarfKnot', (-0.062, -0.14, H0 + 0.49), (0.055, 0.032, 0.048), M['Scarf'], 16, 12))
end = [(-0.064, -0.152, H0 + 0.485), (-0.072, -0.195, H0 + 0.42), (-0.08, -0.205, H0 + 0.35), (-0.085, -0.208, H0 + 0.29)]
torso_objs.append(tube('ScarfEnd', end, [0.05, 0.052, 0.054, 0.054], [M['Scarf'], M['Scarf2']], seg=12, deep=0.3, ups=Vector((0, -1, 0)),
                       mat_fn=lambda t: int(t * 4.999) % 2, shape=lambda a: 1))
for k in range(-2, 3):
    torso_objs.append(tube(f'ScarfFringe.{k}', [(-0.085 + k * 0.02, -0.208, H0 + 0.288), (-0.086 + k * 0.022, -0.21, H0 + 0.24)], [0.008, 0.006], M['Scarf2'], seg=6, subsurf=0))

# skirt of the coat: a bell with soft pleats, a rolled hem, pockets, the placket and a third button
SK = H0 + 0.11
pleat = lambda a, t: 1 + 0.026 * t * t * math.cos(a * 8)
skirt_objs = []
skirt_objs.append(lathe('CoatSkirt', [(0.186, SK + 0.02), (0.196, SK - 0.03), (0.222, SK - 0.1), (0.262, SK - 0.17), (0.298, SK - 0.225), (0.312, SK - 0.245)], M['Coat'], seg=48, shape=pleat, cap=(False, False), subsurf=2))
skirt_objs.append(torus('Hem', (0, 0, SK - 0.247), (0, 0, 1), 0.312, 0.014, M['CoatDark'], U=96, V=8, shape=lambda u: pleat(u + PI / 2, 1)))
skirt_objs.append(ball('CoatInside', (0, 0, SK - 0.2), (0.28, 0.28, 0.02), M['CoatInside'], 24, 8))
def skirt_r(z):
    prof = [(0.196, -0.03), (0.222, -0.1), (0.262, -0.17), (0.298, -0.225), (0.312, -0.245)]
    zz = z - SK
    for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
        if z1 <= zz <= z0: return lerp(r0, r1, (zz - z0) / (z1 - z0))
    return 0.196
spl = [(0, -skirt_r(z) - 0.002, z) for z in (SK + 0.0, SK - 0.08, SK - 0.15, SK - 0.235)]
skirt_objs.append(tube('SkirtPlacket', spl, 0.03, M['CoatDark'], seg=10, deep=0.25, ups=Vector((0, -1, 0))))
skirt_objs.append(ball('Button.2', (0, -skirt_r(SK - 0.085) - 0.012, SK - 0.085), (0.021, 0.011, 0.021), M['Navy'], 16, 10))
for sx in (-1, 1):
    a = sx * 0.64
    z = SK - 0.1
    r = skirt_r(z) + 0.004
    c = Vector((r * math.sin(a), -r * math.cos(a), z))
    fl = ball(f'Pocket.{sx}', (0, 0, 0), (0.062, 0.014, 0.038), M['CoatDark'], 16, 10, warp=lambda p: Vector((p.x, p.y, p.z if p.z < 0 else p.z * 0.4)))
    fl.location = c; fl.rotation_euler = (0.25, 0, a)
    skirt_objs.append(fl)
    skirt_objs.append(ball(f'PocketBtn.{sx}', c + Vector((math.sin(a), -math.cos(a), 0)) * 0.016 + Vector((0, 0, -0.016)), (0.013, 0.007, 0.013), M['Navy'], 12, 8))

# hood, worn down on her back
hood_at = Vector((0, 0.09, H0 + 0.455))
def hood_warp(p):
    y = p.z / 0.125
    p.x *= 1 - 0.5 * sstep(0.1, -1, y)
    p.y *= 1 + 0.2 * sstep(0.5, -0.6, y) - 0.3 * sstep(-0.5, -1, y)
    return p
hood_objs = [ball('Hood', hood_at + Vector((0, 0.062, -0.07)), (0.168, 0.082, 0.125), M['Coat'], 24, 16, warp=hood_warp),
             torus('HoodRim', hood_at + Vector((0, 0.045, 0.012)), (0, -0.48, 0.88), 0.108, 0.022, M['CoatDark'], U=40, V=8, tall=1.0)]
for o in (hood_objs[:1] if not EXPORT else []):
    md = o.modifiers.new('Subsurf', 'SUBSURF'); md.levels = md.render_levels = 1

# the long end of the scarf that streams behind her (the game bends it at five joints); straight back along +Y at rest
KNOT = Vector((0.045, 0.15, H0 + 0.515))
def scarf_tail(droop=0.0):
    pts = []
    for k in range(31):
        s = 0.65 * k / 30
        ang = droop * (0.35 + 1.2 * s)      # 0 = straight back (as the game's rest pose)
        pts.append(KNOT + Vector((0, s * math.cos(ang) - 0.01, -s * math.sin(ang))))
    return pts
def make_tail(pts):
    return tube('ScarfTail', pts, [0.062 - 0.018 * k / 30 for k in range(31)], [M['Scarf'], M['Scarf2']], seg=10, deep=0.26, ups=Vector((0, 0, 1)) if False else [Vector((0, 0, 1))] * 31,
                mat_fn=lambda t: int(t * 10 + 0.01) % 2, subsurf=1)

# a smooth limb hanging straight down from `top`, length `ln`, widths spread along it (open ends: joints are balls)
def limb(name, top, ln, widths, material):
    n = 9
    pts = [Vector(top) + Vector((0, 0, -ln * k / (n - 1))) for k in range(n)]
    ws = []
    for k in range(n):
        f = k / (n - 1) * (len(widths) - 1)
        i = min(int(f), len(widths) - 2)
        ws.append(lerp(widths[i], widths[i + 1], sstep(0, 1, f - i)))
    return tube(name, pts, ws, material, seg=22, cap=False, subsurf=0, ups=Vector((0, -1, 0)))

# ================= ARMS =================
arms = {}
for sx, side in ((1, 'L'), (-1, 'R')):     # three.js armL is at x = -0.205, which is Blender +x
    sh = Vector((sx * 0.205, 0, H0 + 0.385))
    upper = [limb(f'Sleeve.{side}', sh + Vector((0, 0, 0.0)), 0.2, [0.08, 0.074, 0.066], M['Coat']),
             ball(f'Shoulder.{side}', sh, (0.08, 0.08, 0.08), M['Coat'], 24, 16)]
    el = sh + Vector((0, 0, -0.2))
    fore = [limb(f'Forearm.{side}', el, 0.165, [0.066, 0.066, 0.071], M['Coat']),
            ball(f'Elbow.{side}', el, (0.066, 0.066, 0.066), M['Coat'], 20, 14),
            torus(f'Cuff.{side}', el + Vector((0, 0, -0.166)), (0, 0, 1), 0.064, 0.017, M['CoatDark'], U=24, V=8),
            torus(f'MittenCuff.{side}', el + Vector((0, 0, -0.186)), (0, 0, 1), 0.05, 0.017, M['HatDark'], U=24, V=8, shape=lambda u: 1 + 0.12 * math.cos(u * 12) * 0),
            ball(f'Mitten.{side}', el + Vector((0, -0.004, -0.243)), (0.064, 0.058, 0.08), M['Hat'], 20, 14),
            ball(f'Thumb.{side}', el + Vector((-sx * 0.05, -0.03, -0.226)), (0.027, 0.027, 0.034), M['Hat'], 12, 8)]
    arms[side] = (sh, el, upper, fore)

# ================= LEGS =================
legs = {}
def toe_warp(p):
    k = sstep(0.2 * 0.15, -0.9 * 0.15, p.y)
    p.x *= 1 + 0.1 * k
    if p.z > 0: p.z *= 1 + 0.2 * k
    return p
for sx, side in ((1, 'L'), (-1, 'R')):
    hip = Vector((sx * 0.095, 0, H0))
    thigh = [limb(f'Thigh.{side}', hip + Vector((0, 0, 0.02)), 0.35, [0.088, 0.082, 0.07], M['Leg'])]
    kn = hip + Vector((0, 0, -0.33))
    shin = [limb(f'Shin.{side}', kn, 0.14, [0.07, 0.064], M['Leg']),
            ball(f'Knee.{side}', kn, (0.07, 0.07, 0.07), M['Leg'], 20, 14),
            lathe(f'Welly.{side}', [(0.06, -0.082), (0.09, -0.086), (0.097, -0.098), (0.095, -0.114), (0.088, -0.128), (0.084, -0.2), (0.08, -0.29), (0.083, -0.345)], [M['BootDark'], M['Boot']], at=kn, seg=24, cap=(False, False)),
            ball(f'Foot.{side}', kn + Vector((0, -0.05, -0.33)), (0.09, 0.15, 0.07), M['Boot'], 24, 16,
                 warp=lambda p: Vector((p.x * (1 + 0.1 * sstep(0.03, -0.13, p.y)), p.y, max(p.z, -0.05 - (p.z + 0.05) * 0.15) * (1 + 0.2 * sstep(0.03, -0.13, p.y) * (p.z > 0))))),
            lathe(f'Sole.{side}', [(0.0, 0.0), (0.095, 0.0), (0.098, 0.016), (0.095, 0.032), (0.0, 0.032)], M['Sole'], at=kn + Vector((0, -0.05, -0.39)), seg=24),
            lathe(f'Heel.{side}', [(0.0, 0.0), (0.086, 0.0), (0.086, 0.02), (0.0, 0.02)], M['BootDark'], at=kn + Vector((0, 0.045, -0.39 + 0.025)), seg=20)]
    shin[-2].scale = (1, 1.72, 1); shin[-1].scale = (1, 0.8, 1)
    # the welly top is darker (rolled), the rest bright: split by height
    w = shin[1]
    for p in w.data.polygons:
        p.material_index = 0 if p.center.z > kn.z - 0.13 else 1
    legs[side] = (hip, kn, thigh, shin)
# scaled pieces need their scale about their own origin: move origins
for side, (hip, kn, thigh, shin) in legs.items():
    for o in shin[-2:]:
        c = kn + Vector((0, -0.05 if o.name.startswith('Sole') else 0.045, 0))
        me = o.data
        for v in me.vertices: v.co -= Vector((c.x, c.y, 0))
        o.location = (c.x, c.y, 0)

# ================= JOINTS (named like robyn.js) =================
# For the game she must face -Z in three.js, which is +Y here: turn every piece round before the joints are made,
# so the joints carry no turn of their own (the game sets their rotations directly).
tail = make_tail(scarf_tail(0.0))
if EXPORT:
    bpy.context.view_layer.update()
    for o in list(col.objects):
        o.matrix_world = Matrix.Rotation(PI, 4, 'Z') @ o.matrix_world
def empty(name, loc, parent=None):
    loc = Vector(loc)
    if EXPORT: loc = Vector((-loc.x, -loc.y, loc.z))
    e = link(bpy.data.objects.new(name, None))
    e.empty_display_size = 0.05
    if parent:
        e.parent = parent
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(loc)
    else:
        e.location = loc
    return e

def attach(objs, parent):
    bpy.context.view_layer.update()
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = parent
        o.matrix_world = mw

root = empty('Robyn', (0, 0, 0))
lean = empty('lean', (0, 0, 0), root)
hips = empty('hips', (0, 0, H0), lean)
torso = empty('torso', (0, 0, H0), hips)
skirt = empty('skirt', (0, 0, SK), torso)
hood = empty('hood', hood_at, torso)
head = empty('head', HC, torso)
attach(torso_objs, torso); attach(skirt_objs, skirt); attach(hood_objs, hood)
attach(head_objs, head)
for kind, objs in FACES.items():
    g = empty(f'face_{kind}', HC, head)
    attach(objs, g)
    if kind not in ('happy', 'smile'):
        g.hide_render = True; g.hide_viewport = True
        for o in objs: o.hide_render = True
pony_j = empty('pony', PONY_AT, head)
attach([pony], pony_j)
tail_j = empty('scarf', KNOT, torso)
attach([tail], tail_j)
J = {}
for side, (sh, el, upper, fore) in arms.items():
    a = empty(f'arm{side}_sh', sh, torso); attach(upper, a)
    b = empty(f'arm{side}_el', el, a); attach(fore, b)
    J[f'arm{side}'] = (a, b)
for side, (hip, kn, thigh, shin) in legs.items():
    a = empty(f'leg{side}_hip', hip, hips); attach(thigh, a)
    b = empty(f'leg{side}_knee', kn, a); attach(shin, b)
    J[f'leg{side}'] = (a, b)

def pose_standing():
    # a relaxed standing pose for the previews: arms a little out and bent, scarf end hanging, ponytail down
    J['armL'][0].rotation_euler = (0.1, -0.18, 0)
    J['armR'][0].rotation_euler = (0.1, 0.18, 0)
    J['armL'][1].rotation_euler = (0.35, 0, 0)
    J['armR'][1].rotation_euler = (0.35, 0, 0)
def pose_rest():
    for a, b in J.values():
        a.rotation_euler = (0, 0, 0); b.rotation_euler = (0, 0, 0)

if not EXPORT: bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'robyn.blend'))

# ================= RENDER =================
def setup_render():
    scene.render.engine = 'BLENDER_EEVEE'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Punchy'
    try: scene.eevee.taa_render_samples = 64
    except Exception: pass
    world = bpy.data.worlds.new('World'); scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.62, 0.74, 0.9, 1); bg.inputs['Strength'].default_value = 0.8
    def light(name, loc, energy, size, color=(1, 1, 1), target=(0, 0, 1.1)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.color = color; ld.size = size
        ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    light('Key', (-2.5, -3.5, 3.5), 650, 3, (1, 0.95, 0.88))
    light('Fill', (3.5, -2.5, 1.8), 260, 4, (0.85, 0.9, 1))
    light('Rim', (1.5, 3.5, 3.0), 500, 2)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=8)
    g = bpy.data.objects.new('Ground', bpy.data.meshes.new('Ground')); bm.to_mesh(g.data); bm.free()
    scene.collection.objects.link(g); g.data.materials.append(mat('Ground', 'cfd9e4', 0.9))

def render(path, cam_loc, target, lens=50, res=(1200, 1200)):
    scene.render.resolution_x, scene.render.resolution_y = res
    cd = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cd); scene.collection.objects.link(cam)
    cam.location = cam_loc
    cam.rotation_euler = (Vector(target) - Vector(cam_loc)).to_track_quat('-Z', 'Y').to_euler()
    cd.lens = lens; scene.camera = cam
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)

if '--render' in ARGS:
    pose_standing()
    # for the previews the scarf end hangs down her back instead of streaming out
    tail_j.rotation_euler = (math.radians(-78), 0, math.radians(6))
    setup_render()
    out = os.path.join(HERE, 'renders'); os.makedirs(out, exist_ok=True)
    insts = []
    for k, ang in enumerate((0, 35, 90, 180)):
        inst = bpy.data.objects.new(f'Turn.{k}', None)
        inst.instance_type = 'COLLECTION'; inst.instance_collection = col
        scene.collection.objects.link(inst)
        inst.location = ((k - 1.5) * 0.85, 0, 0); inst.rotation_euler = (0, 0, math.radians(ang))
        insts.append(inst)
    scene.collection.children.unlink(col)
    render(os.path.join(out, 'turnaround.png'), (0, -7.2, 1.3), (0, 0, 0.85), lens=50, res=(1600, 1000))
    for o in insts: bpy.data.objects.remove(o)
    scene.collection.children.link(col)
    render(os.path.join(out, 'hero.png'), (1.3, -3.3, 1.5), (0, 0, 0.95), lens=55)
    render(os.path.join(out, 'face.png'), (0.25, -1.25, 1.5), (0, 0, 1.42), lens=60)
    # the three faces side by side
    for kind in ('happy', 'blink', 'shock'):
        for k2, objs in FACES.items():
            on = k2 == kind or (k2 == 'smile' and kind != 'shock')
            bpy.data.objects[f'face_{k2}'].hide_render = not on
            for o in objs: o.hide_render = not on
        render(os.path.join(out, f'face_{kind}.png'), (0.0, -1.1, 1.47), (0, 0, 1.43), lens=70, res=(800, 800))
    tail_j.rotation_euler = (0, 0, 0)
    pose_rest()

if '--export' in ARGS:
    pose_rest()
    for k2, objs in FACES.items():   # every face exported; the game shows one at a time
        bpy.data.objects[f'face_{k2}'].hide_render = False; bpy.data.objects[f'face_{k2}'].hide_viewport = False
        for o in objs: o.hide_render = False; o.hide_viewport = False
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'robyn.glb'), export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for o in col.objects:
        if o.type == 'MESH':
            e = o.evaluated_get(dg); me = e.to_mesh(); tris += sum(len(p.vertices) - 2 for p in me.polygons); e.to_mesh_clear()
    print('EXPORTED TRIANGLES', tris)
