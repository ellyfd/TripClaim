#!/usr/bin/env python3
"""依 manifest 產生報支整包：要印.pdf、Excel、上傳/、zip。

用法：python3 build_pack.py manifest.json [輸出目錄]
規則見 ../references/rules.md；manifest 格式見 ../assets/manifest.example.json。
需要：Pillow、pypdf、openpyxl，以及一個中文字型。
"""
import io, json, math, os, subprocess, sys, zipfile
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PageObject, PdfReader, PdfWriter, Transformation
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

DPI = 300
MM = DPI / 25.4
W, H = round(210 * MM), round(297 * MM)
A4_PT = (595.28, 841.89)
MARGIN = round(5 * MM)
GAP = round(2.5 * MM)          # 同一筆內截圖的間距
ENTRY_GAP = round(12 * MM)     # 筆與筆的間距
LABEL_H = 52
NOTE_H = 60
SLOT_W_MM = 80                 # 熱感紙收據寬
ORANGE, GREY, DARK = (200, 90, 0), (150, 150, 150), (60, 60, 60)
MIN_SCALE = 0.6


def find_font():
    cands = []
    try:
        out = subprocess.run(["fc-match", "-f", "%{file}", "sans:lang=zh-tw"],
                             capture_output=True, text=True).stdout.strip()
        if out:
            cands.append(out)
    except OSError:
        pass
    cands += ["/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
              "/System/Library/Fonts/PingFang.ttc",
              "C:/Windows/Fonts/msjh.ttc"]
    for c in cands:
        if os.path.exists(c):
            return c
    sys.exit("找不到中文字型，請安裝 Noto Sans CJK 或文泉驛正黑")


FONT = find_font()
F_TITLE = ImageFont.truetype(FONT, 54)
F_LABEL = ImageFont.truetype(FONT, 36)
F_NOTE = ImageFont.truetype(FONT, 34)
F_SLOT = ImageFont.truetype(FONT, 45)


def load(path):
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def new_page(title):
    pg = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(pg)
    d.text((MARGIN, MARGIN - 8), title, font=F_TITLE, fill="black")
    d.line((MARGIN, MARGIN + 75, W - MARGIN, MARGIN + 75), fill=(242, 140, 40), width=6)
    return pg, d, MARGIN + 115


def to_pdf_page(img):
    buf = io.BytesIO()
    img.save(buf, "PDF", resolution=DPI)
    buf.seek(0)
    return PdfReader(buf).pages[0]


def dashed_box(d, x, y, w, h):
    for a in range(x, x + w, 36):
        for yy in (y, y + h):
            d.line((a, yy, min(a + 18, x + w), yy), fill=(120, 120, 120), width=3)
    for b in range(y, y + h, 36):
        for xx in (x, x + w):
            d.line((xx, b, xx, min(b + 18, y + h)), fill=(120, 120, 120), width=3)


class Shot:
    def __init__(self, base, spec, ppi):
        self.img = load(os.path.join(base, spec["file"]))
        self.label = spec.get("label", "")
        self.full_w = self.img.width / spec.get("ppi", ppi) * 25.4 * MM  # 手機實際寬

    def size(self, s):
        w = round(self.full_w * s)
        return w, round(self.img.height * w / self.img.width)


def flow(entries, x0, y0, width, s):
    """把每一筆的截圖由左到右排，放不下就換行。回傳 (placements, notes, bottom)。"""
    places, notes, y = [], [], y0
    for ei, e in enumerate(entries):
        x, row_h, first_x = x0, 0, x0
        for sh in e["_shots"]:
            w, h = sh.size(s)
            if x > x0 and x + w > x0 + width:
                y += LABEL_H + row_h + GAP
                x, row_h = x0, 0
            places.append((sh, x, y, w, h, e))
            x += w + GAP
            row_h = max(row_h, h)
        y += LABEL_H + row_h
        notes.append((e, first_x, y))
        y += NOTE_H + (ENTRY_GAP if ei < len(entries) - 1 else 0)
    return places, notes, y


def band_flow(entries, x0, y0, width, s):
    """留位頁右側的一列：所有筆的截圖接續排，同一列內不另加筆距。"""
    places, notes, x, y, row_h, pending = [], [], x0, y0, 0, []
    for e in entries:
        ex = None
        for sh in e["_shots"]:
            w, h = sh.size(s)
            if x > x0 and x + w > x0 + width:
                for pe, px in pending:
                    notes.append((pe, px, y + LABEL_H + row_h))
                pending = []
                y += LABEL_H + row_h + NOTE_H + GAP
                x, row_h = x0, 0
            if ex is None:
                ex = x
            places.append((sh, x, y, w, h, e))
            x += w + GAP
            row_h = max(row_h, h)
        if ex is not None:
            pending.append((e, ex))
    # 同一列各筆的註記貼在自己那張截圖下方
    row_bottoms = {}
    for sh, px, py, w, h, e in places:
        key = (id(e), py)
        row_bottoms[key] = max(row_bottoms.get(key, 0), py + LABEL_H + h)
    notes = []
    seen = set()
    for sh, px, py, w, h, e in reversed(places):
        if id(e) in seen:
            continue
        seen.add(id(e))
        firstx = min(p[1] for p in places if p[5] is e and p[2] == py)
        notes.append((e, firstx, row_bottoms[(id(e), py)]))
    bottom = max([n[2] + NOTE_H for n in notes], default=y0)
    return places, notes, bottom


def draw(pg, d, places, notes):
    for sh, x, y, w, h, e in places:
        lab = e["code"] + ("｜" + e["title"] if e.get("title") and sh is e["_shots"][0] else "")
        if sh.label:
            lab += "｜" + sh.label
        d.text((x, y), lab, font=F_LABEL, fill=ORANGE)
        pg.paste(sh.img.resize((w, h), Image.LANCZOS), (x, y + LABEL_H))
        d.rectangle((x - 1, y + LABEL_H - 1, x + w, y + LABEL_H + h), outline=(170, 170, 170), width=2)
    for e, x, y in notes:
        if e.get("_note"):
            d.text((x, y + 12), "→ " + e["code"] + " 憑證：" + e["_note"], font=F_NOTE, fill=DARK)


def shot_pages(item, with_slots):
    """回傳這個項目的截圖頁（PIL Image 清單）。with_slots=False 用於上傳檔。"""
    entries = [e for e in item["entries"] if e["_shots"]]
    slot_entries = [e for e in item["entries"] if e["_slots"]] if with_slots else []
    if not entries and not slot_entries:
        return []
    title = item["category"] + "｜信用卡明細"
    pages = []
    if not slot_entries:
        s = 1.0
        while s >= MIN_SCALE:
            pg, d, top = new_page(title)
            places, notes, bottom = flow(entries, MARGIN, top, W - 2 * MARGIN, s)
            if bottom <= H - MARGIN:
                draw(pg, d, places, notes)
                return [pg]
            s -= 0.02
        chunk = []  # 一頁放不下：實際大小、逐筆分頁
        for e in entries:
            _, _, bottom = flow(chunk + [e], MARGIN, MARGIN + 115, W - 2 * MARGIN, 1.0)
            if chunk and bottom > H - MARGIN:
                pg, d, top = new_page(title)
                draw(pg, d, *flow(chunk, MARGIN, top, W - 2 * MARGIN, 1.0)[:2])
                pages.append(pg)
                chunk = []
            chunk.append(e)
        pg, d, top = new_page(title)
        draw(pg, d, *flow(chunk, MARGIN, top, W - 2 * MARGIN, 1.0)[:2])
        return pages + [pg]

    title = item["category"] + "｜實體收據黏貼處（左）＋信用卡明細（右）"
    slots = [(e, p) for e in slot_entries for p in e["_slots"]]
    others = [e for e in entries if not e["_slots"]]
    sw = round(SLOT_W_MM * MM)
    for pi in range(0, len(slots), 2):
        pair = slots[pi:pi + 2]
        pg, d, top = new_page(title)
        bottom_lim = H - MARGIN
        sh_h = (bottom_lim - top - GAP) // 2 - LABEL_H
        tops = [top, top + LABEL_H + sh_h + GAP]
        for k, (e, p) in enumerate(pair):
            d.text((MARGIN, tops[k]), f"{e['code']}｜{p.get('label', '實體收據')}", font=F_LABEL, fill=ORANGE)
            dashed_box(d, MARGIN, tops[k] + LABEL_H, sw, sh_h)
            d.multiline_text((MARGIN + sw / 2, tops[k] + LABEL_H + sh_h / 2), "實體收據\n貼這裡",
                             font=F_SLOT, fill=GREY, anchor="mm", align="center")
        xr = MARGIN + sw + round(4 * MM)
        width = W - MARGIN - xr
        band1 = [e for e in {id(x[0]): x[0] for x in pair}.values() if e["_shots"]]
        band2 = others if pi == 0 else []
        s = 1.0
        while True:
            # 兩欄並排為準：寬度不夠先縮
            a = band_flow(band1, xr, tops[0], width, s)
            b = band_flow(band2, xr, tops[1], width, s)
            two_up = all(2 * sh.size(s)[0] + GAP <= width for e in band1 + band2 for sh in e["_shots"])
            if (two_up and a[2] <= tops[1] - GAP and b[2] <= bottom_lim) or s <= MIN_SCALE:
                break
            s -= 0.01
        draw(pg, d, a[0], a[1])
        draw(pg, d, b[0], b[1])
        pages.append(pg)
    return pages


def efile_pages(base, spec):
    path = os.path.join(base, spec["file"])
    if not path.lower().endswith(".pdf"):
        img = load(path)
        pg = Image.new("RGB", (W, H), "white")
        k = min((W - 2 * MARGIN) / img.width, (H - 2 * MARGIN) / img.height, DPI / 150)
        img = img.resize((int(img.width * k), int(img.height * k)), Image.LANCZOS)
        pg.paste(img, ((W - img.width) // 2, MARGIN))
        return [to_pdf_page(pg)]
    reader = PdfReader(path)
    out = []
    for n in spec.get("pages") or range(1, len(reader.pages) + 1):
        src = reader.pages[n - 1]
        pw, ph = float(src.mediabox.width), float(src.mediabox.height)
        if abs(pw - A4_PT[0]) < 2 and abs(ph - A4_PT[1]) < 2:
            out.append(src)
            continue
        k = 1.0
        if ph > A4_PT[1] + 2 or pw > A4_PT[0] + 30:   # 比 A4 大很多才不得不縮
            k = min(A4_PT[0] / pw, A4_PT[1] / ph)
            print(f"  ! {spec['file']} 第 {n} 頁比 A4 大，縮為 {k:.0%}")
        a4 = PageObject.create_blank_page(width=A4_PT[0], height=A4_PT[1])
        a4.merge_transformed_page(src, Transformation().scale(k).translate(
            tx=(A4_PT[0] - pw * k) / 2, ty=A4_PT[1] - ph * k))
        out.append(a4)
    return out


def photo_pages(base, item):
    """上傳檔用：實體單據的照片。小收據照實際寬度排在同一頁，其餘一張一頁。"""
    small, big = [], []
    for e in item["entries"]:
        for p in e.get("physical", []):
            if not p.get("photo"):
                continue
            img = load(os.path.join(base, p["photo"]))
            if p.get("crop"):
                img = img.crop(tuple(p["crop"]))
            (small if p.get("kind") == "small" else big).append((e, p, img))
    pages = []
    if small:
        pg, d, top = new_page(item["category"] + "｜實體收據")
        x, y, row_h = MARGIN, top, 0
        for e, p, img in small:
            w = round(p.get("width_mm", SLOT_W_MM) * MM)
            h = round(img.height * w / img.width)
            if h > H - MARGIN - top - LABEL_H:
                h = H - MARGIN - top - LABEL_H
                w = round(img.width * h / img.height)
            if x > MARGIN and x + w > W - MARGIN:
                x, y, row_h = MARGIN, y + LABEL_H + row_h + GAP, 0
            if y + LABEL_H + h > H - MARGIN:
                pages.append(to_pdf_page(pg))
                pg, d, top = new_page(item["category"] + "｜實體收據")
                x, y, row_h = MARGIN, top, 0
            d.text((x, y), f"{e['code']}｜{p.get('label', '')}", font=F_LABEL, fill=ORANGE)
            pg.paste(img.resize((w, h), Image.LANCZOS), (x, y + LABEL_H))
            x += w + round(5 * MM)
            row_h = max(row_h, h)
        pages.append(to_pdf_page(pg))
    for e, p, img in big:
        pg = Image.new("RGB", (W, H), "white")
        k = min((W - 2 * MARGIN) / img.width, (H - 2 * MARGIN) / img.height)
        img = img.resize((int(img.width * k), int(img.height * k)), Image.LANCZOS)
        pg.paste(img, ((W - img.width) // 2, MARGIN))
        pages.append(to_pdf_page(pg))
    return pages


def voucher_count(item):
    n = 0
    for e in item["entries"]:
        n += sum(s.get("vouchers", 1) for s in e.get("screenshots", []))
        n += len(e.get("efiles", []))
        n += sum(p.get("count", 1) for p in e.get("physical", []))
    return n


def set_notes(item, n_shot_pages):
    """每一筆的憑證在哪：下一頁／下 N 頁／黏貼處／紙本另附。"""
    offset = n_shot_pages
    slot_i = 0
    for e in item["entries"]:
        parts = []
        for p in e.get("physical", []):
            if p.get("kind") == "small":
                parts.append(("左上" if slot_i % 2 == 0 else "左下") + "黏貼處")
                slot_i += 1
            elif p.get("kind") == "a4":
                parts.append(p.get("label", "紙本") + "（紙本）另附")
        for f in e.get("efiles", []):
            n = len(e["_efile_pages"][id(f)])
            where = "見下一頁" if offset == 1 else f"見下 {offset} 頁"
            parts.append(f.get("label", "收據") + where)
            offset += n
        e["_note"] = "；".join(parts)


def write_pdf(pages, path):
    w = PdfWriter()
    for p in pages:
        w.add_page(p)
    with open(path, "wb") as f:
        w.write(f)
    return len(pages)


def write_xlsx(m, path, out):
    wb = Workbook()
    ws = wb.active
    ws.title = "旅費報支申請"
    ws.append(["項目", "幣別", "金額", "憑證數", "附件", "Remark", "費用歸屬"])
    totals = {}
    for i, it in enumerate(m["items"], 1):
        att = f"{i}_{it['category']}.pdf"
        ws.append([it["category"], it["currency"], it["amount"], voucher_count(it),
                   att if os.path.exists(os.path.join(out, "上傳", att)) else "",
                   it.get("remark", ""), it.get("cost_center", "")])
        totals[it["currency"]] = totals.get(it["currency"], 0) + it["amount"]
    for cur, amt in totals.items():
        ws.append(["合計", cur, amt])
    thin = Side(style="thin", color="DDDDDD")
    for c in ws[1]:
        c.fill = PatternFill("solid", fgColor="F28C28")
        c.font = Font(bold=True, color="FFFFFF")
        c.alignment = Alignment(horizontal="center")
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.border = Border(bottom=thin)
            c.alignment = Alignment(vertical="top", wrap_text=True)
        row[2].number_format = "#,##0.##"
        if row[0].value == "合計":
            for c in row:
                c.font = Font(bold=True)
    for col, wd in zip("ABCDEFG", [18, 8, 12, 8, 24, 70, 22]):
        ws.column_dimensions[col].width = wd
    wb.save(path)


def main():
    mpath = sys.argv[1]
    m = json.load(open(mpath, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(mpath))
    name = m["name"] + ("_" + m["version"] if m.get("version") else "")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(base, "整包_" + name)
    os.makedirs(os.path.join(out, "上傳"), exist_ok=True)
    ppi = m.get("phone_ppi", 460)

    print_pages = []
    for i, it in enumerate(m["items"], 1):
        for e in it["entries"]:
            e["_shots"] = [Shot(base, s, ppi) for s in e.get("screenshots", [])]
            e["_slots"] = [p for p in e.get("physical", []) if p.get("kind") == "small"]
            e["_efile_pages"] = {id(f): efile_pages(base, f) for f in e.get("efiles", [])}
        # 先排一次算頁數，再填「見下 N 頁」重排
        for e in it["entries"]:
            e["_note"] = ""
        set_notes(it, len(shot_pages(it, True)))
        printed = [to_pdf_page(p) for p in shot_pages(it, True)]
        efs = [pg for e in it["entries"] for f in e.get("efiles", []) for pg in e["_efile_pages"][id(f)]]
        print_pages += printed + efs
        set_notes(it, len(shot_pages(it, False)))
        for e in it["entries"]:   # 上傳檔沒有留位框，黏貼處改成「照片見後」
            e["_note"] = e["_note"].replace("左上黏貼處", "照片見後").replace("左下黏貼處", "照片見後")
        up = [to_pdf_page(p) for p in shot_pages(it, False)] + efs + photo_pages(base, it)
        n = write_pdf(up, os.path.join(out, "上傳", f"{i}_{it['category']}.pdf")) if up else 0
        print(f"{i}_{it['category']}: 憑證數 {voucher_count(it)}，上傳 {n} 頁，要印 {len(printed) + len(efs)} 頁")
    print("要印.pdf:", write_pdf(print_pages, os.path.join(out, "要印.pdf")), "頁")
    write_xlsx(m, os.path.join(out, name + ".xlsx"), out)
    zpath = out.rstrip("/") + ".zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:   # zipfile 會替中文檔名標 UTF-8
        for root, _, files in os.walk(out):
            for f in sorted(files):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, out))
    print("zip:", zpath)


if __name__ == "__main__":
    main()
