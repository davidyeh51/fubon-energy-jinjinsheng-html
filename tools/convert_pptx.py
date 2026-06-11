from __future__ import annotations

import html
import json
import posixpath
import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PPTX_GLOB = "*20260611.pptx"
BASE_W = 1280

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
SCHEME = {
    "dk1": "#1f2933",
    "lt1": "#ffffff",
    "dk2": "#163d35",
    "lt2": "#f8faf7",
    "accent1": "#006f53",
    "accent2": "#87a922",
    "accent3": "#d2a72d",
    "accent4": "#3f7f8f",
    "accent5": "#6b7280",
    "accent6": "#1f5f91",
    "tx1": "#1f2933",
    "tx2": "#374151",
    "bg1": "#ffffff",
    "bg2": "#f8faf7",
}


def find_source() -> Path:
    desktop = Path.home() / "Desktop"
    matches = sorted(desktop.glob(PPTX_GLOB), key=lambda p: p.stat().st_mtime, reverse=True)
    if not matches:
        raise FileNotFoundError(f"No PPTX matching {PPTX_GLOB!r} found on Desktop")
    return matches[0]


def qn(tag: str) -> str:
    return tag.split("}", 1)[-1]


def emu_to_px(value: str | int | None, slide_w: int) -> float:
    if value is None:
        return 0.0
    return float(value) * BASE_W / slide_w


def pct_box(x: float, y: float, cx: float, cy: float, slide_w: int, slide_h: int) -> dict[str, float]:
    scale = BASE_W / slide_w
    return {
        "x": round(x * scale, 3),
        "y": round(y * scale, 3),
        "w": round(cx * scale, 3),
        "h": round(cy * scale, 3),
    }


def parse_xfrm(node: ET.Element | None, slide_w: int, inherited: dict | None = None) -> dict:
    inherited = inherited or {"x": 0, "y": 0, "sx": 1, "sy": 1}
    if node is None:
        return {"x": inherited["x"], "y": inherited["y"], "w": 0, "h": 0, "rot": 0}
    off = node.find("a:off", NS)
    ext = node.find("a:ext", NS)
    x = float(off.get("x", 0)) if off is not None else 0
    y = float(off.get("y", 0)) if off is not None else 0
    w = float(ext.get("cx", 0)) if ext is not None else 0
    h = float(ext.get("cy", 0)) if ext is not None else 0
    return {
        "x": inherited["x"] + x * inherited["sx"],
        "y": inherited["y"] + y * inherited["sy"],
        "w": w * inherited["sx"],
        "h": h * inherited["sy"],
        "rot": round(float(node.get("rot", 0)) / 60000, 3),
    }


def parse_group_transform(node: ET.Element, inherited: dict | None = None) -> dict:
    inherited = inherited or {"x": 0, "y": 0, "sx": 1, "sy": 1}
    xfrm = node.find("p:grpSpPr/a:xfrm", NS)
    if xfrm is None:
        return inherited
    off = xfrm.find("a:off", NS)
    ext = xfrm.find("a:ext", NS)
    ch_off = xfrm.find("a:chOff", NS)
    ch_ext = xfrm.find("a:chExt", NS)
    ox = float(off.get("x", 0)) if off is not None else 0
    oy = float(off.get("y", 0)) if off is not None else 0
    ew = float(ext.get("cx", 1)) if ext is not None else 1
    eh = float(ext.get("cy", 1)) if ext is not None else 1
    cx = float(ch_off.get("x", 0)) if ch_off is not None else 0
    cy = float(ch_off.get("y", 0)) if ch_off is not None else 0
    cw = float(ch_ext.get("cx", ew)) if ch_ext is not None else ew
    ch = float(ch_ext.get("cy", eh)) if ch_ext is not None else eh
    sx = ew / cw if cw else 1
    sy = eh / ch if ch else 1
    return {
        "x": inherited["x"] + (ox - cx * sx) * inherited["sx"],
        "y": inherited["y"] + (oy - cy * sy) * inherited["sy"],
        "sx": inherited["sx"] * sx,
        "sy": inherited["sy"] * sy,
    }


def color_from(node: ET.Element | None) -> str | None:
    if node is None:
        return None
    srgb = node.find(".//a:srgbClr", NS)
    if srgb is not None and srgb.get("val"):
        return f"#{srgb.get('val')}"
    scheme = node.find(".//a:schemeClr", NS)
    if scheme is not None:
        return SCHEME.get(scheme.get("val", ""), None)
    return None


def fill_color(sp_pr: ET.Element | None) -> str | None:
    if sp_pr is None or sp_pr.find("a:noFill", NS) is not None:
        return None
    return color_from(sp_pr.find("a:solidFill", NS))


def line_style(sp_pr: ET.Element | None) -> dict:
    if sp_pr is None:
        return {}
    ln = sp_pr.find("a:ln", NS)
    if ln is None or ln.find("a:noFill", NS) is not None:
        return {}
    style = {}
    color = color_from(ln.find("a:solidFill", NS))
    if color:
        style["borderColor"] = color
    width = ln.get("w")
    if width:
        style["borderWidth"] = round(float(width) / 12700 * 96 / 72, 2)
    return style


def text_style(run: ET.Element, paragraph: ET.Element) -> dict:
    rpr = run.find("a:rPr", NS)
    ppr = paragraph.find("a:pPr", NS)
    style: dict[str, object] = {}
    if rpr is not None:
        if rpr.get("sz"):
            style["fontSize"] = round(int(rpr.get("sz")) / 100 * 96 / 72, 2)
        if rpr.get("b") == "1":
            style["bold"] = True
        if rpr.get("i") == "1":
            style["italic"] = True
        color = color_from(rpr.find("a:solidFill", NS))
        if color:
            style["color"] = color
        latin = rpr.find("a:latin", NS)
        ea = rpr.find("a:ea", NS)
        typeface = (ea.get("typeface") if ea is not None else None) or (
            latin.get("typeface") if latin is not None else None
        )
        if typeface:
            style["fontFamily"] = typeface
    if ppr is not None and ppr.get("algn"):
        style["align"] = ppr.get("algn")
    return style


def css_from_text_style(style: dict) -> str:
    out = []
    if style.get("fontSize"):
        out.append(f"font-size:{style['fontSize']}px")
    if style.get("bold"):
        out.append("font-weight:700")
    if style.get("italic"):
        out.append("font-style:italic")
    if style.get("color"):
        out.append(f"color:{style['color']}")
    if style.get("fontFamily"):
        out.append("font-family:'{}','Noto Sans TC',sans-serif".format(str(style["fontFamily"]).replace("'", "")))
    return ";".join(out)


def parse_text(sp: ET.Element) -> tuple[str, dict]:
    tx = sp.find("p:txBody", NS)
    if tx is None:
        return "", {}
    paragraphs = []
    shape_style: dict[str, object] = {}
    for p in tx.findall("a:p", NS):
        ppr = p.find("a:pPr", NS)
        align = ppr.get("algn") if ppr is not None else None
        spans = []
        for run in p.findall("a:r", NS):
            txt = "".join(t.text or "" for t in run.findall("a:t", NS))
            if not txt:
                continue
            st = text_style(run, p)
            if st.get("fontSize") and not shape_style.get("fontSize"):
                shape_style["fontSize"] = st["fontSize"]
            if st.get("color") and not shape_style.get("color"):
                shape_style["color"] = st["color"]
            spans.append(f"<span style=\"{css_from_text_style(st)}\">{html.escape(txt)}</span>")
        if not spans:
            paragraphs.append("<div><br></div>")
            continue
        style_attr = f" style=\"text-align:{align}\"" if align else ""
        paragraphs.append(f"<div{style_attr}>{''.join(spans)}</div>")
    body_pr = tx.find("a:bodyPr", NS)
    if body_pr is not None and body_pr.get("anchor"):
        shape_style["anchor"] = body_pr.get("anchor")
    return "".join(paragraphs), shape_style


def rels_for_slide(z: zipfile.ZipFile, slide_index: int) -> dict[str, str]:
    path = f"ppt/slides/_rels/slide{slide_index}.xml.rels"
    if path not in z.namelist():
        return {}
    root = ET.fromstring(z.read(path))
    rels = {}
    for rel in root.findall("rel:Relationship", REL_NS):
        rels[rel.get("Id")] = rel.get("Target")
    return rels


def media_target(target: str) -> str:
    return posixpath.normpath(posixpath.join("ppt/slides", target))


def copy_media(z: zipfile.ZipFile, source: str, output_name: str) -> str:
    ASSETS.mkdir(parents=True, exist_ok=True)
    ext = Path(source).suffix.lower() or ".bin"
    dest_name = f"{output_name}{ext}"
    dest = ASSETS / dest_name
    with z.open(source) as src, dest.open("wb") as out:
        shutil.copyfileobj(src, out)
    return f"assets/{dest_name}"


def parse_shape(sp: ET.Element, slide_w: int, slide_h: int, inherited: dict, z_order: int) -> dict | None:
    sp_pr = sp.find("p:spPr", NS)
    box = parse_xfrm(sp_pr.find("a:xfrm", NS) if sp_pr is not None else None, slide_w, inherited)
    html_text, tstyle = parse_text(sp)
    fill = fill_color(sp_pr)
    line = line_style(sp_pr)
    if not html_text and not fill and not line:
        return None
    result = {
        "type": "text" if html_text else "shape",
        "box": pct_box(box["x"], box["y"], box["w"], box["h"], slide_w, slide_h),
        "rot": box["rot"],
        "z": z_order,
        "html": html_text,
        "style": {"fill": fill, **line, **tstyle},
    }
    return result


def parse_picture(
    pic: ET.Element,
    slide_w: int,
    slide_h: int,
    inherited: dict,
    rels: dict[str, str],
    z: zipfile.ZipFile,
    slide_index: int,
    pic_index: int,
    z_order: int,
) -> dict | None:
    sp_pr = pic.find("p:spPr", NS)
    box = parse_xfrm(sp_pr.find("a:xfrm", NS) if sp_pr is not None else None, slide_w, inherited)
    blip = pic.find(".//a:blip", NS)
    if blip is None:
        return None
    rid = blip.get(f"{{{NS['r']}}}embed")
    if not rid or rid not in rels:
        return None
    target = media_target(rels[rid])
    if target not in z.namelist():
        return None
    src = copy_media(z, target, f"slide{slide_index:02d}_image{pic_index:02d}")
    return {
        "type": "image",
        "src": src,
        "box": pct_box(box["x"], box["y"], box["w"], box["h"], slide_w, slide_h),
        "rot": box["rot"],
        "z": z_order,
    }


def parse_graphic_frame(frame: ET.Element, slide_w: int, slide_h: int, inherited: dict, z_order: int) -> dict | None:
    xfrm = frame.find("p:xfrm", NS)
    box = parse_xfrm(xfrm, slide_w, inherited)
    texts = []
    for t in frame.findall(".//a:t", NS):
        if t.text:
            texts.append(t.text)
    if not texts:
        return None
    body = "<br>".join(html.escape(t) for t in texts)
    return {
        "type": "text",
        "box": pct_box(box["x"], box["y"], box["w"], box["h"], slide_w, slide_h),
        "rot": box["rot"],
        "z": z_order,
        "html": f"<div>{body}</div>",
        "style": {"fontSize": 18, "color": "#1f2933", "fill": "rgba(255,255,255,.72)"},
    }


def background(root: ET.Element) -> str:
    bg = root.find(".//p:bgPr", NS)
    color = color_from(bg.find("a:solidFill", NS)) if bg is not None else None
    return color or "#ffffff"


def parse_children(
    node: ET.Element,
    slide_w: int,
    slide_h: int,
    inherited: dict,
    rels: dict[str, str],
    z: zipfile.ZipFile,
    slide_index: int,
    counters: dict[str, int],
    elements: list[dict],
) -> None:
    for child in list(node):
        name = qn(child.tag)
        if name == "nvGrpSpPr" or name == "grpSpPr":
            continue
        if name == "grpSp":
            parse_children(child, slide_w, slide_h, parse_group_transform(child, inherited), rels, z, slide_index, counters, elements)
        elif name == "sp":
            counters["z"] += 1
            item = parse_shape(child, slide_w, slide_h, inherited, counters["z"])
            if item:
                item["id"] = f"s{slide_index}-e{counters['z']}"
                elements.append(item)
        elif name == "pic":
            counters["z"] += 1
            counters["pic"] += 1
            item = parse_picture(child, slide_w, slide_h, inherited, rels, z, slide_index, counters["pic"], counters["z"])
            if item:
                item["id"] = f"s{slide_index}-e{counters['z']}"
                elements.append(item)
        elif name == "graphicFrame":
            counters["z"] += 1
            item = parse_graphic_frame(child, slide_w, slide_h, inherited, counters["z"])
            if item:
                item["id"] = f"s{slide_index}-e{counters['z']}"
                elements.append(item)


def convert() -> dict:
    pptx = find_source()
    if ASSETS.exists():
        shutil.rmtree(ASSETS)
    ASSETS.mkdir(parents=True, exist_ok=True)
    slides = []
    with zipfile.ZipFile(pptx) as z:
        pres = ET.fromstring(z.read("ppt/presentation.xml"))
        size = pres.find("p:sldSz", NS)
        slide_w = int(size.get("cx"))
        slide_h = int(size.get("cy"))
        scale = BASE_W / slide_w
        base_h = round(slide_h * scale)
        slide_paths = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)],
            key=lambda x: int(re.search(r"(\d+)", x).group(1)),
        )
        for idx, path in enumerate(slide_paths, 1):
            root = ET.fromstring(z.read(path))
            sp_tree = root.find("p:cSld/p:spTree", NS)
            rels = rels_for_slide(z, idx)
            elements: list[dict] = []
            counters = {"z": 0, "pic": 0}
            if sp_tree is not None:
                parse_children(sp_tree, slide_w, slide_h, {"x": 0, "y": 0, "sx": 1, "sy": 1}, rels, z, idx, counters, elements)
            text_bits = []
            for el in elements:
                if el.get("html"):
                    text_bits.append(re.sub("<[^>]+>", " ", el["html"]))
            title = " ".join(" ".join(text_bits).split())[:42] or f"Slide {idx}"
            slides.append(
                {
                    "number": idx,
                    "title": title,
                    "background": background(root),
                    "elements": elements,
                }
            )
    return {
        "source": pptx.name,
        "generated": "2026-06-11",
        "width": BASE_W,
        "height": base_h,
        "slides": slides,
    }


def main() -> None:
    data = convert()
    (ROOT / "slides-data.js").write_text(
        "window.DECK_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Converted {len(data['slides'])} slides from {data['source']}")


if __name__ == "__main__":
    main()
