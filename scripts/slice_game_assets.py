import os
import shutil
from collections import deque
from PIL import Image

SRC_DIR = "assets/game/NEW"
OUT_DIR = "assets/game/v2"


def strip_white_bg_flood(img: Image.Image, seed_center: bool = False) -> Image.Image:
    """Remove outer near-white background via BFS flood fill, preserving internal whites."""
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    def is_bg(r, g, b, a):
        if a < 15:
            return True
        # Near-white OR baked checkerboard light-grey (low-saturation neutral background)
        mx = max(r, g, b)
        mn = min(r, g, b)
        return mn > 175 and (mx - mn) < 18

    visited = bytearray(w * h)
    q = deque()

    # Seed outer borders
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b, a):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b, a):
                idx = y * w + x
                if not visited[idx]:
                    visited[idx] = 1
                    q.append((x, y))

    if seed_center:
        cx, cy = w // 2, h // 2
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h:
                    r, g, b, a = px[nx, ny]
                    if is_bg(r, g, b, a):
                        idx = ny * w + nx
                        if not visited[idx]:
                            visited[idx] = 1
                            q.append((nx, ny))

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx]:
                    r, g, b, a = px[nx, ny]
                    if is_bg(r, g, b, a):
                        visited[idx] = 1
                        q.append((nx, ny))

    # 1px anti-halo pass on boundary pixels adjacent to transparent
    to_soften = []
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b, a = px[x, y]
            if a > 0 and min(r, g, b) > 195 and (max(r, g, b) - min(r, g, b)) < 30:
                if (
                    px[x - 1, y][3] == 0
                    or px[x + 1, y][3] == 0
                    or px[x, y - 1][3] == 0
                    or px[x, y + 1][3] == 0
                ):
                    to_soften.append((x, y, r, g, b))
    for x, y, r, g, b in to_soften:
        if min(r, g, b) > 218:
            px[x, y] = (0, 0, 0, 0)
        else:
            px[x, y] = (r, g, b, 90)

    return rgba


def fit_centered(img: Image.Image, size: int, pad: int = 8, bottom_align: bool = False) -> Image.Image:
    bbox = img.getbbox()
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if not bbox:
        return canvas
    cropped = img.crop(bbox)
    cw, ch = cropped.size
    avail = size - pad * 2
    scale = min(avail / cw, avail / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - pad - nh) if bottom_align else (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def slice_grid_animation(src_name: str, out_subdir: str, rows: int, cols: int, target_size: int = 192, bottom_align: bool = True):
    path = os.path.join(SRC_DIR, src_name)
    img = strip_white_bg_flood(Image.open(path))
    w, h = img.size
    cell_w = w / cols
    cell_h = h / rows

    out_dir = os.path.join(OUT_DIR, out_subdir)
    os.makedirs(out_dir, exist_ok=True)

    # First pass: collect trimmed frames and max dimension for uniform scale across frames
    cells = []
    max_dim = 1
    for r in range(rows):
        for c in range(cols):
            x0 = int(round(c * cell_w))
            y0 = int(round(r * cell_h))
            x1 = int(round((c + 1) * cell_w))
            y1 = int(round((r + 1) * cell_h))
            cell = img.crop((x0, y0, x1, y1))
            bbox = cell.getbbox()
            if bbox:
                trimmed = cell.crop(bbox)
                max_dim = max(max_dim, trimmed.width, trimmed.height)
                cells.append(trimmed)
            else:
                cells.append(None)

    pad = 10
    avail = target_size - pad * 2
    scale = avail / max_dim

    for idx, trimmed in enumerate(cells):
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        if trimmed:
            nw = max(1, int(trimmed.width * scale))
            nh = max(1, int(trimmed.height * scale))
            resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)
            ox = (target_size - nw) // 2
            oy = (target_size - pad - nh) if bottom_align else (target_size - nh) // 2
            canvas.paste(resized, (ox, oy), resized)
        canvas.save(os.path.join(out_dir, f"frame_{idx:02d}.png"), optimize=True)
    print(f"  Sliced {rows}x{cols} ({len(cells)} frames) -> {out_subdir}")


def find_x_segments(band_img: Image.Image, min_gap: int = 10, min_width: int = 24):
    """Split a horizontal band into item segments using vertical alpha projection."""
    w, h = band_img.size
    px = band_img.load()
    col_has_ink = []
    for x in range(w):
        has = False
        for y in range(h):
            if px[x, y][3] > 20:
                has = True
                break
        col_has_ink.append(has)

    # Bridge tiny gaps (e.g. floating sparkles near a weapon)
    bridged = col_has_ink[:]
    gap_start = None
    for x in range(w):
        if not col_has_ink[x]:
            if gap_start is None:
                gap_start = x
        else:
            if gap_start is not None and (x - gap_start) < min_gap:
                for gx in range(gap_start, x):
                    bridged[gx] = True
            gap_start = None

    segments = []
    start = None
    for x in range(w):
        if bridged[x] and start is None:
            start = x
        elif not bridged[x] and start is not None:
            if x - start >= min_width:
                segments.append((start, x))
            start = None
    if start is not None and w - start >= min_width:
        segments.append((start, w))
    return segments


def slice_band_items(img: Image.Image, y0: int, y1: int, names: list[str], out_subdir: str, target_size: int = 128, min_gap: int = 14, seed_center_names: set[str] = None):
    """Extract distinct 2D connected-component islands inside a horizontal band, sorted left-to-right."""
    band = img.crop((0, y0, img.width, y1))
    bw, bh = band.size
    px = band.load()
    visited = bytearray(bw * bh)
    islands = []  # (min_x, pixels_list)

    # 2D BFS with small jump radius to keep detached sparkles with their parent item
    jump = 5
    for y in range(bh):
        for x in range(bw):
            idx = y * bw + x
            if not visited[idx] and px[x, y][3] > 20:
                q = deque([(x, y)])
                visited[idx] = 1
                pts = []
                sum_x = 0
                while q:
                    cx, cy = q.popleft()
                    pts.append((cx, cy))
                    sum_x += cx
                    for dy in range(-jump, jump + 1):
                        ny = cy + dy
                        if 0 <= ny < bh:
                            for dx in range(-jump, jump + 1):
                                nx = cx + dx
                                if 0 <= nx < bw:
                                    nidx = ny * bw + nx
                                    if not visited[nidx] and px[nx, ny][3] > 20:
                                        visited[nidx] = 1
                                        q.append((nx, ny))
                if len(pts) >= 120:  # ignore tiny stray dust
                    islands.append((sum_x / len(pts), pts))

    islands.sort(key=lambda it: it[0])

    # If extra tiny sparkle islands remain, merge them into nearest major island
    while len(islands) > len(names):
        # Find smallest island and merge into closest by centroid X
        smallest_idx = min(range(len(islands)), key=lambda i: len(islands[i][1]))
        sx_c, s_pts = islands.pop(smallest_idx)
        nearest_idx = min(range(len(islands)), key=lambda i: abs(islands[i][0] - sx_c))
        islands[nearest_idx][1].extend(s_pts)

    out_dir = os.path.join(OUT_DIR, out_subdir)
    os.makedirs(out_dir, exist_ok=True)

    if len(islands) != len(names):
        print(f"  [WARN] Expected {len(names)} islands in {out_subdir} band {y0}..{y1}, found {len(islands)}. Falling back to equal cols.")
        cw = img.width / len(names)
        for i, name in enumerate(names):
            item = band.crop((int(i * cw), 0, int((i + 1) * cw), bh))
            if seed_center_names and name in seed_center_names:
                item = strip_white_bg_flood(item, seed_center=True)
            fit_centered(item, target_size, pad=6).save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    else:
        for (_, pts), name in zip(islands, names):
            item = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
            ipx = item.load()
            for ix, iy in pts:
                ipx[ix, iy] = px[ix, iy]
            if seed_center_names and name in seed_center_names:
                item = strip_white_bg_flood(item, seed_center=True)
            fit_centered(item, target_size, pad=6).save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    print(f"  Extracted {len(names)} items -> {out_subdir}")


def process_single(src_name: str, out_rel_path: str, target_size: int = 256, pad: int = 8):
    path = os.path.join(SRC_DIR, src_name)
    img = strip_white_bg_flood(Image.open(path))
    fitted = fit_centered(img, target_size, pad=pad)
    out_path = os.path.join(OUT_DIR, out_rel_path)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fitted.save(out_path, optimize=True)
    print(f"  Cleaned single -> {out_rel_path}")


def main():
    print("Starting NeuroNinja Professional Sprite Cutter...")
    os.makedirs(OUT_DIR, exist_ok=True)

    # 1. Player Ninja Animation Sheets
    process_single("Teal Scarf Ninja Sprite.png", "characters/ninja/ninja_master.png", 256)
    slice_grid_animation("Chibi Ninja Idle Animation Sprite Sheet.png", "characters/ninja/idle", 2, 3, 192, True)
    slice_grid_animation("Chibi Ninja Walking Sprite Sheet.png", "characters/ninja/walk", 2, 4, 192, True)
    slice_grid_animation("Chibi Ninja Sword Attack Sprite Sheet.png", "characters/ninja/attack", 2, 4, 192, True)
    slice_grid_animation("Pixel Ninja Knockback Sprite Sheet.png", "characters/ninja/hit", 1, 4, 192, True)
    slice_grid_animation("Chibi Ninja Victory Animation Sheet.png", "characters/ninja/victory", 2, 3, 192, True)

    # 2. Scroll Hydra Enemy Sheets (skipping duplicate (1).png)
    process_single("Pixel Art Three-Headed Scroll Hydra.png", "enemies/scroll_hydra/scroll_hydra_master.png", 256)
    slice_grid_animation("Six-Frame Scroll Hydra Sprite Sheet.png", "enemies/scroll_hydra/idle", 2, 3, 224, True)
    slice_grid_animation("Scroll Hydra Attack Sprite Sheet.png", "enemies/scroll_hydra/attack", 2, 4, 224, True)

    # 3. Weapons & Equip Glow Sheet (1254x1254)
    wpn_sheet = strip_white_bg_flood(Image.open(os.path.join(SRC_DIR, "Fantasy Pixel-Art Weapon and Magic Sprite Sheet.png")))
    slice_band_items(
        wpn_sheet, 0, 380,
        ["wpn_wooden_katana", "wpn_silver_katana", "wpn_golden_katana", "wpn_shadow_katana", "wpn_dragon_katana"],
        "weapons", 128, min_gap=18
    )
    slice_band_items(
        wpn_sheet, 380, 750,
        ["wpn_wind_kunai", "wpn_stone_hammer", "wpn_shadow_bow", "wpn_light_staff"],
        "weapons", 128, min_gap=20
    )
    # Equip glow 2x4 in bottom band y=750..1254
    glow_band = wpn_sheet.crop((0, 750, wpn_sheet.width, wpn_sheet.height))
    os.makedirs(os.path.join(OUT_DIR, "weapons/equip_glow"), exist_ok=True)
    gw, gh = glow_band.width / 4, glow_band.height / 2
    idx = 0
    for r in range(2):
        for c in range(4):
            cell = glow_band.crop((int(c * gw), int(r * gh), int((c + 1) * gw), int((r + 1) * gh)))
            fit_centered(cell, 128, pad=4).save(os.path.join(OUT_DIR, f"weapons/equip_glow/frame_{idx:02d}.png"), optimize=True)
            idx += 1
    print("  Extracted 8 frames -> weapons/equip_glow")

    # Bonus standalone katanas
    process_single("Golden Katana with Magical Sparkles.png", "weapons/wpn_golden_katana_sparkle.png", 128)
    process_single("Icy Blue Katana Sprite.png", "weapons/wpn_icy_katana.png", 128)

    # 4. Gear & Chests Sheet (1254x1254)
    gear_sheet = strip_white_bg_flood(Image.open(os.path.join(SRC_DIR, "Fantasy RPG Gear and Chest Animation Sprite Sheet.png")))
    slice_band_items(
        gear_sheet, 0, 225,
        ["gear_starter_gi", "gear_focus_robe", "gear_guardian_armour", "gear_stoneplate_armour", "gear_wind_cloak", "gear_ninja_headband"],
        "gear", 128, min_gap=10
    )
    slice_band_items(
        gear_sheet, 225, 445,
        ["chest_wooden_closed", "chest_silver_closed", "chest_gold_closed", "chest_magic_closed", "chest_legendary_closed", "chest_wooden_open"],
        "chests", 128, min_gap=10
    )
    # Chest opening 2x4 (y=445..865)
    open_band = gear_sheet.crop((0, 445, gear_sheet.width, 865))
    os.makedirs(os.path.join(OUT_DIR, "chests/opening"), exist_ok=True)
    ow, oh = open_band.width / 4, open_band.height / 2
    idx = 0
    for r in range(2):
        for c in range(4):
            cell = open_band.crop((int(c * ow), int(r * oh), int((c + 1) * ow), int((r + 1) * oh)))
            fit_centered(cell, 160, pad=6, bottom_align=True).save(os.path.join(OUT_DIR, f"chests/opening/frame_{idx:02d}.png"), optimize=True)
            idx += 1
    print("  Extracted 8 frames -> chests/opening")

    # Reward burst 2x4 (y=865..1254)
    burst_band = gear_sheet.crop((0, 865, gear_sheet.width, gear_sheet.height))
    os.makedirs(os.path.join(OUT_DIR, "chests/burst"), exist_ok=True)
    bw, bh = burst_band.width / 4, burst_band.height / 2
    idx = 0
    for r in range(2):
        for c in range(4):
            cell = burst_band.crop((int(c * bw), int(r * bh), int((c + 1) * bw), int((r + 1) * bh)))
            fit_centered(cell, 160, pad=4).save(os.path.join(OUT_DIR, f"chests/burst/frame_{idx:02d}.png"), optimize=True)
            idx += 1
    print("  Extracted 8 frames -> chests/burst")

    # 5. UI Resource & Frames Sheet (1536x1024)
    ui_sheet = strip_white_bg_flood(Image.open(os.path.join(SRC_DIR, "Fantasy Game UI Resource Icon Sheet.png")))
    slice_band_items(
        ui_sheet, 0, 320,
        ["res_gold", "res_wood", "res_stone", "res_energy"],
        "ui", 128, min_gap=20
    )
    slice_band_items(
        ui_sheet, 320, 645,
        ["icon_mission_scroll", "icon_focus_hourglass", "icon_habit_leaf", "icon_task_board"],
        "ui", 128, min_gap=20
    )
    slice_band_items(
        ui_sheet, 645, 1024,
        ["frame_common", "frame_rare", "frame_legendary", "badge_mission", "badge_boss"],
        "ui", 192, min_gap=16,
        seed_center_names={"frame_common", "frame_rare", "frame_legendary"}
    )

    # 6. Isometric Castle Buildings & Tiles
    castle_map = {
        "Isometric Grassy Terrain Tile.png": ("castle/tile_grass.png", 192),
        "Isometric Mossy Stone Pavement Tile.png": ("castle/tile_stone_path.png", 192),
        "Isometric Ninja Fortress Dojo.png": ("castle/keep_lv1.png", 256),
        "Ornate Pagoda Fortress Game Asset.png": ("castle/keep_lv2.png", 256),
        "Ornate Teal-Flagged Pagoda Fortress.png": ("castle/keep_lv3.png", 256),
        "Isometric Blue-Roofed Dojo Temple.png": ("castle/dojo_lv1.png", 256),
        "Focus Dojo Temple_ Level Two.png": ("castle/dojo_lv2.png", 256),
        "Mystical Teal Shrine Temple.png": ("castle/habit_shrine.png", 256),
        "Fantasy Blacksmith Workshop Forge.png": ("castle/task_forge.png", 256),
        "Fantasy Watchtower with Teal Banners.png": ("castle/watchtower.png", 224),
        "Fantasy Archer Tower Game Asset.png": ("castle/archer_tower.png", 224),
        "Isometric Martial Arts Training Yard.png": ("castle/training_yard.png", 256),
        "Fantasy Resource Market Storehouse.png": ("castle/resource_store.png", 256),
        "Ornate Fantasy Castle Wall Asset.png": ("castle/wall_straight.png", 192),
        "Isometric Fantasy Castle Corner Tower.png": ("castle/wall_corner_tower.png", 224),
        "Fantasy Castle Gate with Drawbridge.png": ("castle/castle_gate.png", 256),
        "Enchanted Lantern Bonsai Tree.png": ("castle/decor_bonsai.png", 192),
        "Fantasy Lantern Post with Banner.png": ("castle/decor_lantern.png", 192),
    }
    for src_f, (out_f, sz) in castle_map.items():
        process_single(src_f, out_f, sz, pad=6)

    # 7. Studio Audio MP3s
    audio_out = os.path.join(OUT_DIR, "audio")
    os.makedirs(audio_out, exist_ok=True)
    audio_map = {
        "audio--chest_open-Create-a-short-wooden-chest-opening-so.mp3": "sfx_chest_open.mp3",
        "audio--level_up-Create-an-uplifting-original-fantasy-lev.mp3": "sfx_level_up.mp3",
        "audio--mission_complete-Create-a-short-positive-mission-.mp3": "sfx_mission_complete.mp3",
        "audio--rare_reward-Create-a-short-rare-item-reveal-chime.mp3": "sfx_rare_reward.mp3",
        "audio--xp_gain-Create-a-tiny-rising-sparkle-sound-for-ga.mp3": "sfx_xp_gain.mp3",
    }
    for src_a, out_a in audio_map.items():
        shutil.copy2(os.path.join(SRC_DIR, src_a), os.path.join(audio_out, out_a))
        print(f"  Copied audio -> audio/{out_a}")

    print("All assets sliced, cleaned, and organized into assets/game/v2/!")


if __name__ == "__main__":
    main()
