import zlib
import struct
import math
import os

class PNGCanvas:
    def __init__(self, width, height, bg=(0, 0, 0, 0)):
        self.w = width
        self.h = height
        self.buf = bytearray(width * height * 4)
        if bg[3] > 0:
            for i in range(0, len(self.buf), 4):
                self.buf[i] = bg[0]
                self.buf[i+1] = bg[1]
                self.buf[i+2] = bg[2]
                self.buf[i+3] = bg[3]

    def set_pixel(self, x, y, r, g, b, a=255):
        if x < 0 or x >= self.w or y < 0 or y >= self.h or a <= 0:
            return
        idx = (int(y) * self.w + int(x)) * 4
        if a >= 255:
            self.buf[idx] = r
            self.buf[idx+1] = g
            self.buf[idx+2] = b
            self.buf[idx+3] = 255
        else:
            sa = a / 255.0
            da = self.buf[idx+3] / 255.0
            out_a = sa + da * (1.0 - sa)
            if out_a > 0:
                self.buf[idx] = int((r * sa + self.buf[idx] * da * (1.0 - sa)) / out_a)
                self.buf[idx+1] = int((g * sa + self.buf[idx+1] * da * (1.0 - sa)) / out_a)
                self.buf[idx+2] = int((b * sa + self.buf[idx+2] * da * (1.0 - sa)) / out_a)
                self.buf[idx+3] = int(out_a * 255)

    def draw_rect(self, x0, y0, w, h, col):
        r, g, b, a = col if len(col) == 4 else (*col, 255)
        for y in range(max(0, int(y0)), min(self.h, int(y0 + h))):
            for x in range(max(0, int(x0)), min(self.w, int(x0 + w))):
                self.set_pixel(x, y, r, g, b, a)

    def draw_circle(self, cx, cy, rad, col, fill=True, border_col=None, border_w=1):
        r, g, b, a = col if len(col) == 4 else (*col, 255)
        rad2 = rad * rad
        inner_rad2 = (rad - border_w) * (rad - border_w) if border_col else 0
        min_x = max(0, int(cx - rad - 2))
        max_x = min(self.w, int(cx + rad + 2))
        min_y = max(0, int(cy - rad - 2))
        max_y = min(self.h, int(cy + rad + 2))
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                d2 = (x - cx)**2 + (y - cy)**2
                if fill and d2 <= rad2:
                    if border_col and d2 >= inner_rad2:
                        br, bg_c, bb, ba = border_col if len(border_col) == 4 else (*border_col, 255)
                        self.set_pixel(x, y, br, bg_c, bb, ba)
                    else:
                        self.set_pixel(x, y, r, g, b, a)
                elif not fill and inner_rad2 <= d2 <= rad2:
                    self.set_pixel(x, y, r, g, b, a)

    def draw_glow(self, cx, cy, rad, col):
        r, g, b = col[:3]
        max_a = col[3] if len(col) == 4 else 180
        for y in range(max(0, int(cy - rad)), min(self.h, int(cy + rad))):
            for x in range(max(0, int(cx - rad)), min(self.w, int(cx + rad))):
                dist = math.hypot(x - cx, y - cy)
                if dist < rad:
                    falloff = (1.0 - (dist / rad)) ** 1.8
                    self.set_pixel(x, y, r, g, b, int(max_a * falloff))

    def draw_line(self, x0, y0, x1, y1, col, thick=1):
        r, g, b, a = col if len(col) == 4 else (*col, 255)
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        steps = max(int(max(dx, dy) * 1.5), 1)
        for i in range(steps + 1):
            t = i / float(steps)
            cx = x0 + (x1 - x0) * t
            cy = y0 + (y1 - y0) * t
            if thick <= 1:
                self.set_pixel(int(cx), int(cy), r, g, b, a)
            else:
                self.draw_circle(cx, cy, thick / 2.0, (r, g, b, a))

    def draw_polygon(self, pts, col):
        if len(pts) < 3:
            return
        if len(pts) == 3:
            self.draw_triangle(pts[0], pts[1], pts[2], col)
            return
        # Triangle fan for convex / simple polygons
        p0 = pts[0]
        for i in range(1, len(pts) - 1):
            self.draw_triangle(p0, pts[i], pts[i+1], col)

    def draw_triangle(self, p1, p2, p3, col):
        # Bounding box
        min_x = max(0, int(min(p1[0], p2[0], p3[0])))
        max_x = min(self.w, int(max(p1[0], p2[0], p3[0])) + 1)
        min_y = max(0, int(min(p1[1], p2[1], p3[1])))
        max_y = min(self.h, int(max(p1[1], p2[1], p3[1])) + 1)
        
        def sign(p1, p2, p3):
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

        r, g, b, a = col if len(col) == 4 else (*col, 255)
        for y in range(min_y, max_y):
            for x in range(min_x, max_x):
                pt = (x + 0.5, y + 0.5)
                d1 = sign(pt, p1, p2)
                d2 = sign(pt, p2, p3)
                d3 = sign(pt, p3, p1)
                has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
                has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
                if not (has_neg and has_pos):
                    self.set_pixel(x, y, r, g, b, a)

    def save_png(self, path):
        raw_data = bytearray()
        for y in range(self.h):
            raw_data.append(0) # Filter type 0 (None)
            row_start = y * self.w * 4
            raw_data.extend(self.buf[row_start : row_start + self.w * 4])
        
        compressed = zlib.compress(bytes(raw_data), 9)
        
        def chunk(tag, data):
            res = bytearray()
            res.extend(struct.pack('>I', len(data)))
            res.extend(tag)
            res.extend(data)
            crc = zlib.crc32(tag + data) & 0xffffffff
            res.extend(struct.pack('>I', crc))
            return res
        
        header = b'\x89PNG\r\n\x1a\n'
        ihdr = struct.pack('>IIBBBBB', self.w, self.h, 8, 6, 0, 0, 0)
        
        with open(path, 'wb') as f:
            f.write(header)
            f.write(chunk(b'IHDR', ihdr))
            f.write(chunk(b'IDAT', compressed))
            f.write(chunk(b'IEND', b''))


def generate_ninja_avatar(path):
    c = PNGCanvas(256, 256)
    # Background soft aura glow (Emerald Chi)
    c.draw_glow(128, 128, 110, (0, 230, 153, 90))
    c.draw_circle(128, 128, 105, (12, 20, 32, 230), border_col=(0, 230, 153, 255), border_w=3)
    
    # Katana scabbard on back
    c.draw_line(65, 45, 195, 215, (30, 35, 45, 255), thick=8)
    c.draw_line(55, 35, 75, 55, (245, 158, 11, 255), thick=10) # Golden hilt
    c.draw_line(48, 28, 58, 38, (0, 230, 153, 255), thick=6) # Emerald pommel tassel
    
    # Shinobi Hood / Head
    c.draw_circle(128, 115, 62, (18, 24, 38, 255))
    c.draw_circle(128, 115, 58, (24, 32, 50, 255))
    
    # Mask cowl / face opening
    c.draw_rect(96, 100, 64, 28, (10, 14, 22, 255))
    c.draw_rect(98, 102, 60, 24, (22, 17, 30, 255))
    
    # Glowing Cybernetic Eyes
    c.draw_glow(112, 112, 12, (0, 230, 153, 220))
    c.draw_glow(144, 112, 12, (0, 230, 153, 220))
    c.draw_rect(106, 110, 14, 5, (220, 255, 245, 255))
    c.draw_rect(136, 110, 14, 5, (220, 255, 245, 255))
    
    # Forehead Shinobi Plate / Protector
    c.draw_rect(98, 80, 60, 16, (40, 48, 65, 255))
    c.draw_rect(100, 82, 56, 12, (60, 72, 95, 255))
    # Plate rivets
    c.draw_circle(103, 88, 2, (180, 200, 220, 255))
    c.draw_circle(153, 88, 2, (180, 200, 220, 255))
    # Chi emblem engraved on plate
    c.draw_line(124, 88, 132, 88, (0, 230, 153, 255), thick=2)
    c.draw_line(128, 84, 128, 92, (0, 230, 153, 255), thick=2)
    
    # Scarf / Shawl fluttering
    c.draw_polygon([(90, 150), (166, 150), (180, 190), (128, 175), (76, 190)], (0, 180, 120, 255))
    c.draw_polygon([(95, 155), (161, 155), (170, 185), (128, 172), (85, 185)], (0, 230, 153, 255))
    
    # Shoulders / Torso Armor
    c.draw_polygon([(55, 225), (85, 160), (171, 160), (201, 225)], (24, 32, 50, 255))
    # Chest plate accents
    c.draw_rect(110, 185, 36, 40, (15, 20, 32, 255))
    c.draw_line(128, 185, 128, 225, (0, 230, 153, 200), thick=2)
    
    c.save_png(path)


def generate_boss_doomscroll(path):
    c = PNGCanvas(256, 256)
    # Dark Void / Neon Crimson-Violet Glitch Aura
    c.draw_glow(128, 128, 120, (239, 68, 68, 110))
    c.draw_glow(128, 128, 90, (139, 92, 246, 140))
    
    # Floating chaotic glitch ribbons / feed scrolls
    c.draw_rect(30, 50, 50, 8, (239, 68, 68, 200))
    c.draw_rect(180, 65, 45, 6, (139, 92, 246, 220))
    c.draw_rect(20, 180, 60, 7, (239, 68, 68, 180))
    c.draw_rect(175, 195, 55, 8, (139, 92, 246, 200))
    
    # Shadow Demon Cloak / Body
    c.draw_polygon([(128, 40), (210, 210), (170, 240), (128, 215), (86, 240), (46, 210)], (15, 10, 25, 255))
    c.draw_polygon([(128, 55), (195, 205), (128, 190), (61, 205)], (28, 18, 48, 255))
    
    # Jagged Demon Horns
    c.draw_polygon([(100, 80), (80, 30), (110, 65)], (239, 68, 68, 255))
    c.draw_polygon([(156, 80), (176, 30), (146, 65)], (239, 68, 68, 255))
    
    # Doomscroll Infinite Feed Portal on Chest
    c.draw_circle(128, 150, 35, (10, 5, 20, 255), border_col=(239, 68, 68, 255), border_w=3)
    c.draw_circle(128, 150, 26, (30, 10, 50, 255))
    # Downward red vortex chevrons (Infinite scroll indicator)
    c.draw_polygon([(118, 138), (128, 148), (138, 138), (128, 142)], (239, 68, 68, 255))
    c.draw_polygon([(118, 150), (128, 160), (138, 150), (128, 154)], (245, 158, 11, 255))
    
    # Menacing Crimson Demon Eyes
    c.draw_glow(110, 100, 14, (239, 68, 68, 255))
    c.draw_glow(146, 100, 14, (239, 68, 68, 255))
    c.draw_polygon([(100, 96), (120, 100), (105, 105)], (255, 230, 230, 255))
    c.draw_polygon([(156, 96), (136, 100), (151, 105)], (255, 230, 230, 255))
    
    # Sharp shadowy claws
    c.draw_polygon([(46, 160), (25, 180), (45, 175)], (239, 68, 68, 255))
    c.draw_polygon([(210, 160), (231, 180), (211, 175)], (239, 68, 68, 255))
    
    c.save_png(path)


def generate_boss_procrastination(path):
    c = PNGCanvas(256, 256)
    # Sickly Golden-Amber / Petrification Aura
    c.draw_glow(128, 128, 115, (245, 158, 11, 100))
    c.draw_glow(128, 128, 85, (100, 116, 139, 130))
    
    # Medusa / Gorgon Snake Tendrils (Coiling hair)
    snake_col = (45, 55, 50, 255)
    snake_glow = (16, 185, 129, 255)
    for ang in [20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320]:
        rad = math.radians(ang)
        x = 128 + math.cos(rad) * 65
        y = 100 + math.sin(rad) * 55
        c.draw_circle(x, y, 16, snake_col)
        c.draw_circle(x + math.cos(rad)*8, y + math.sin(rad)*8, 5, snake_glow) # snake eyes
    
    # Gorgon Face / Head
    c.draw_circle(128, 115, 48, (71, 85, 105, 255)) # Slate stone skin
    c.draw_circle(128, 115, 42, (100, 116, 139, 255))
    
    # Hypnotic Hourglass Crown (Time trap)
    c.draw_polygon([(115, 55), (141, 55), (128, 70)], (245, 158, 11, 255))
    c.draw_polygon([(115, 85), (141, 85), (128, 70)], (245, 158, 11, 255))
    c.draw_circle(128, 70, 4, (255, 255, 255, 255))
    
    # Hypnotic Petrification Eyes (Glows intensely amber)
    c.draw_glow(114, 110, 16, (245, 158, 11, 255))
    c.draw_glow(142, 110, 16, (245, 158, 11, 255))
    c.draw_circle(114, 110, 8, (255, 245, 180, 255))
    c.draw_circle(142, 110, 8, (255, 245, 180, 255))
    c.draw_circle(114, 110, 3, (180, 83, 9, 255))
    c.draw_circle(142, 110, 3, (180, 83, 9, 255))
    
    # Sluggish Stoned Robe & Heavy Chains
    c.draw_polygon([(65, 235), (95, 150), (161, 150), (191, 235)], (51, 65, 85, 255))
    # Massive rusted chain links holding the victim
    c.draw_line(70, 180, 186, 210, (148, 163, 184, 255), thick=6)
    c.draw_line(70, 210, 186, 180, (148, 163, 184, 255), thick=6)
    
    c.save_png(path)


def generate_boss_sloth(path):
    c = PNGCanvas(256, 256)
    # Sleepy Violet / Fog Aura
    c.draw_glow(128, 128, 110, (147, 51, 234, 110))
    c.draw_glow(128, 128, 70, (56, 189, 248, 120))
    
    # Spectral ghostly body with wispy smoke
    c.draw_polygon([(128, 45), (200, 160), (180, 230), (145, 210), (128, 235), (105, 210), (76, 230), (56, 160)], (30, 27, 75, 230))
    c.draw_polygon([(128, 60), (185, 155), (128, 210), (71, 155)], (76, 29, 149, 240))
    
    # Pillow / Cloud of lethargy base
    c.draw_circle(85, 215, 25, (49, 46, 129, 200))
    c.draw_circle(128, 220, 28, (49, 46, 129, 220))
    c.draw_circle(171, 215, 25, (49, 46, 129, 200))
    
    # Ghostly face
    c.draw_circle(128, 105, 42, (109, 40, 217, 255))
    
    # Droopy sleepy eyes & Zzz icon
    c.draw_glow(112, 100, 12, (56, 189, 248, 220))
    c.draw_glow(144, 100, 12, (56, 189, 248, 220))
    # Closed half-moon droopy eyes
    c.draw_line(105, 100, 120, 102, (224, 242, 254, 255), thick=3)
    c.draw_line(136, 102, 151, 100, (224, 242, 254, 255), thick=3)
    
    # Heavy rusted iron ball & chain dragging the specter down
    c.draw_circle(190, 185, 22, (30, 41, 59, 255), border_col=(148, 163, 184, 255), border_w=3)
    c.draw_line(150, 150, 190, 185, (100, 116, 139, 255), thick=5)
    
    # Floating 'Z' runes
    c.draw_line(170, 70, 185, 70, (192, 132, 252, 255), thick=3)
    c.draw_line(185, 70, 170, 85, (192, 132, 252, 255), thick=3)
    c.draw_line(170, 85, 185, 85, (192, 132, 252, 255), thick=3)
    
    c.save_png(path)


def generate_boss_akuma(path):
    c = PNGCanvas(256, 256)
    # Blazing Magma / Hellfire Colossus Aura
    c.draw_glow(128, 128, 125, (239, 68, 68, 140))
    c.draw_glow(128, 128, 90, (245, 158, 11, 170))
    
    # Colossal Samurai Kabuto Helmet & Horns
    # Massive gold crest (Maedate)
    c.draw_polygon([(128, 20), (140, 60), (128, 55), (116, 60)], (245, 158, 11, 255))
    c.draw_polygon([(128, 55), (180, 25), (150, 65)], (245, 158, 11, 255))
    c.draw_polygon([(128, 55), (76, 25), (106, 65)], (245, 158, 11, 255))
    
    # Helmet dome
    c.draw_circle(128, 95, 55, (20, 15, 20, 255))
    c.draw_circle(128, 95, 48, (38, 24, 32, 255))
    
    # Menpo (Demonic Iron Mask)
    c.draw_polygon([(85, 105), (171, 105), (155, 160), (128, 170), (101, 160)], (20, 15, 20, 255))
    # Sharp demon teeth grin
    for i in range(5):
        tx = 106 + i * 9
        c.draw_polygon([(tx, 135), (tx+6, 135), (tx+3, 145)], (255, 255, 255, 255))
        c.draw_polygon([(tx, 155), (tx+6, 155), (tx+3, 147)], (255, 255, 255, 255))
        
    # Blazing Red Core Eyes
    c.draw_glow(110, 112, 15, (239, 68, 68, 255))
    c.draw_glow(146, 112, 15, (239, 68, 68, 255))
    c.draw_circle(110, 112, 6, (255, 230, 150, 255))
    c.draw_circle(146, 112, 6, (255, 230, 150, 255))
    
    # Huge Spiked O-Sode Shoulder Guards
    c.draw_polygon([(20, 220), (45, 130), (85, 145), (60, 235)], (50, 20, 25, 255))
    c.draw_polygon([(236, 220), (211, 130), (171, 145), (196, 235)], (50, 20, 25, 255))
    # Magma veins on armor
    c.draw_line(45, 150, 75, 210, (239, 68, 68, 255), thick=3)
    c.draw_line(211, 150, 181, 210, (239, 68, 68, 255), thick=3)
    
    # Massive chest plate with glowing magma fissure
    c.draw_polygon([(75, 170), (181, 170), (160, 245), (96, 245)], (25, 15, 20, 255))
    c.draw_line(128, 175, 118, 205, (245, 158, 11, 255), thick=4)
    c.draw_line(118, 205, 135, 225, (239, 68, 68, 255), thick=4)
    c.draw_line(135, 225, 128, 245, (245, 158, 11, 255), thick=4)
    
    c.save_png(path)


def generate_tenshu_t1(path):
    c = PNGCanvas(256, 256)
    # Hill / stone foundation base
    c.draw_polygon([(40, 235), (216, 235), (195, 185), (61, 185)], (70, 75, 80, 255))
    # Wood watchtower cabin
    c.draw_rect(80, 110, 96, 75, (120, 80, 45, 255))
    c.draw_rect(88, 120, 80, 65, (140, 95, 55, 255))
    # Wood beams
    c.draw_line(80, 110, 176, 185, (90, 60, 35, 255), thick=3)
    c.draw_line(176, 110, 80, 185, (90, 60, 35, 255), thick=3)
    # Watch window
    c.draw_rect(112, 130, 32, 25, (30, 20, 15, 255))
    c.draw_glow(128, 142, 15, (245, 158, 11, 180)) # Warm lantern
    # Thatched triangular roof
    c.draw_polygon([(55, 115), (201, 115), (128, 55)], (100, 65, 35, 255))
    c.draw_polygon([(65, 112), (191, 112), (128, 62)], (130, 85, 45, 255))
    # Sentry lantern hanging
    c.draw_circle(72, 125, 6, (245, 158, 11, 255))
    c.save_png(path)


def generate_tenshu_t2(path):
    c = PNGCanvas(256, 256)
    # Fortified Stone Rampart Base
    c.draw_polygon([(30, 240), (226, 240), (205, 175), (51, 175)], (55, 65, 75, 255))
    # Stone masonry lines
    for y in [190, 210, 230]:
        c.draw_line(45, y, 211, y, (35, 45, 55, 255), thick=2)
    # Lower Pagoda Floor (Plaster white & dark wood)
    c.draw_rect(75, 125, 106, 50, (210, 215, 220, 255))
    c.draw_rect(80, 130, 96, 45, (230, 235, 240, 255))
    c.draw_line(128, 125, 128, 175, (40, 35, 30, 255), thick=4)
    # Lower curved roof eaves (Dark Blue-Grey Tile)
    c.draw_polygon([(50, 125), (206, 125), (185, 105), (71, 105)], (30, 41, 59, 255))
    # Upper Pagoda Tower
    c.draw_rect(90, 65, 76, 40, (230, 235, 240, 255))
    c.draw_rect(112, 75, 32, 30, (20, 25, 35, 255)) # Grated window
    c.draw_glow(128, 90, 12, (0, 230, 153, 180)) # Chi lantern
    # Upper ornate flared roof
    c.draw_polygon([(65, 65), (191, 65), (128, 30)], (30, 41, 59, 255))
    c.draw_polygon([(75, 63), (181, 63), (128, 35)], (51, 65, 85, 255))
    # Golden roof-end shachihoko fish ornaments
    c.draw_circle(72, 60, 4, (245, 158, 11, 255))
    c.draw_circle(184, 60, 4, (245, 158, 11, 255))
    c.save_png(path)


def generate_tenshu_t3(path):
    c = PNGCanvas(256, 256)
    # Golden Aura of Mastery
    c.draw_glow(128, 128, 120, (245, 158, 11, 80))
    c.draw_glow(128, 100, 70, (0, 230, 153, 90))
    # Massive Cyclopean Stone Base with Golden Trim
    c.draw_polygon([(20, 245), (236, 245), (210, 180), (46, 180)], (35, 40, 50, 255))
    c.draw_polygon([(46, 180), (210, 180), (206, 175), (50, 175)], (245, 158, 11, 255))
    # Tier 1 Grand Hall
    c.draw_rect(65, 135, 126, 45, (240, 245, 250, 255))
    c.draw_polygon([(35, 135), (221, 135), (195, 110), (61, 110)], (15, 23, 42, 255)) # Obsidian roof
    # Golden ridge-caps on roof
    c.draw_line(35, 133, 195, 110, (245, 158, 11, 255), thick=3)
    c.draw_line(221, 133, 61, 110, (245, 158, 11, 255), thick=3)
    # Tier 2 Observation Keep
    c.draw_rect(80, 75, 96, 35, (240, 245, 250, 255))
    c.draw_polygon([(55, 75), (201, 75), (175, 52), (81, 52)], (15, 23, 42, 255))
    # Tier 3 Imperial Tenshu Spire
    c.draw_rect(95, 32, 66, 20, (245, 158, 11, 255)) # Pure gold upper walls
    c.draw_polygon([(70, 32), (186, 32), (128, 8)], (245, 158, 11, 255)) # Golden crown roof
    # Glowing Shogun Tenshu Crest
    c.draw_glow(128, 92, 18, (0, 230, 153, 230))
    c.draw_circle(128, 92, 10, (15, 23, 42, 255), border_col=(0, 230, 153, 255), border_w=2)
    # Twin golden Shachihoko statues at top
    c.draw_polygon([(74, 30), (66, 15), (78, 22)], (245, 158, 11, 255))
    c.draw_polygon([(182, 30), (190, 15), (178, 22)], (245, 158, 11, 255))
    c.save_png(path)


def generate_forge_building(path):
    c = PNGCanvas(256, 256)
    # Warm Fiery Forge Glow
    c.draw_glow(128, 150, 95, (239, 68, 68, 120))
    c.draw_glow(128, 150, 60, (245, 158, 11, 170))
    
    # Stone & Brick Workshop Base
    c.draw_rect(50, 120, 156, 110, (50, 45, 55, 255))
    c.draw_rect(55, 125, 146, 100, (65, 55, 68, 255))
    
    # Stone Chimney with billowing smoke
    c.draw_rect(170, 40, 30, 80, (60, 50, 60, 255))
    c.draw_circle(185, 30, 16, (140, 140, 150, 160))
    c.draw_circle(200, 18, 22, (180, 180, 190, 120))
    
    # Forge Archway Furnace (Burning bright inside)
    c.draw_rect(95, 155, 66, 75, (20, 15, 20, 255))
    c.draw_circle(128, 155, 33, (20, 15, 20, 255))
    # Molten coals inside
    c.draw_circle(128, 185, 25, (239, 68, 68, 255))
    c.draw_circle(128, 192, 16, (245, 158, 11, 255))
    c.draw_circle(128, 197, 8, (255, 255, 220, 255))
    
    # Heavy Iron Anvil in foreground
    c.draw_polygon([(100, 225), (156, 225), (146, 210), (110, 210)], (30, 35, 45, 255)) # base
    c.draw_rect(112, 198, 32, 12, (30, 35, 45, 255)) # waist
    c.draw_polygon([(92, 198), (164, 198), (156, 186), (85, 186)], (100, 116, 139, 255)) # horn & table
    # Glowing hot steel billet on anvil
    c.draw_rect(118, 182, 22, 6, (245, 158, 11, 255))
    
    # Workshop Roof
    c.draw_polygon([(40, 120), (216, 120), (128, 65)], (40, 30, 35, 255))
    c.draw_polygon([(50, 117), (206, 117), (128, 70)], (70, 50, 55, 255))
    c.save_png(path)


def generate_springs_building(path):
    c = PNGCanvas(256, 256)
    # Healing Chi Mist Glow
    c.draw_glow(128, 150, 105, (0, 230, 153, 110))
    c.draw_glow(128, 150, 60, (56, 189, 248, 140))
    
    # Onsen Stone Basin / Natural Rocks
    c.draw_circle(128, 165, 80, (71, 85, 105, 255))
    c.draw_circle(128, 165, 68, (15, 76, 92, 255)) # Deep water
    c.draw_circle(128, 165, 60, (20, 184, 166, 230)) # Mineral hot spring water
    c.draw_circle(128, 165, 45, (45, 212, 191, 200)) # Glowing thermal core
    
    # Steaming Chi Wisps
    c.draw_line(100, 140, 108, 115, (204, 251, 241, 160), thick=3)
    c.draw_line(128, 130, 124, 100, (204, 251, 241, 180), thick=4)
    c.draw_line(156, 140, 148, 115, (204, 251, 241, 160), thick=3)
    
    # Wooden Bathhouse Pergola / Pavillion
    c.draw_line(70, 190, 70, 95, (120, 80, 50, 255), thick=6)
    c.draw_line(186, 190, 186, 95, (120, 80, 50, 255), thick=6)
    # Curved bamboo trellis roof
    c.draw_line(55, 95, 201, 95, (140, 95, 60, 255), thick=6)
    c.draw_polygon([(55, 92), (201, 92), (128, 70)], (100, 70, 40, 255))
    
    # Cherry Blossom Branch (Sakura Petals)
    c.draw_line(65, 75, 110, 55, (90, 55, 30, 255), thick=4)
    for bx, by in [(75, 68), (90, 60), (105, 52), (120, 58), (85, 48)]:
        c.draw_circle(bx, by, 7, (244, 114, 182, 240)) # Pink petals
        c.draw_circle(bx, by, 3, (253, 232, 240, 255))
        
    # Stone Lantern (Toro)
    c.draw_rect(50, 175, 16, 25, (100, 116, 139, 255))
    c.draw_circle(58, 170, 10, (245, 158, 11, 255)) # Lantern flame
    c.save_png(path)


def generate_gates(path, damaged=False):
    c = PNGCanvas(256, 256)
    # Fortified Torii Gate Pillars
    pillar_col = (185, 28, 28, 255) if not damaged else (120, 40, 40, 255)
    c.draw_rect(55, 60, 22, 170, pillar_col) # Left post
    c.draw_rect(179, 60, 22, 170, pillar_col) # Right post
    # Stone foundations
    c.draw_rect(48, 215, 36, 25, (71, 85, 105, 255))
    c.draw_rect(172, 215, 36, 25, (71, 85, 105, 255))
    
    # Heavy Iron-Studded Wooden Portcullis Doors
    door_col = (30, 35, 45, 255)
    c.draw_rect(77, 85, 102, 140, door_col)
    # Metal reinforcement cross-bars
    c.draw_rect(77, 105, 102, 10, (51, 65, 85, 255))
    c.draw_rect(77, 155, 102, 10, (51, 65, 85, 255))
    c.draw_rect(77, 200, 102, 10, (51, 65, 85, 255))
    # Golden rivets
    for ry in [110, 160, 205]:
        for rx in [90, 115, 141, 166]:
            c.draw_circle(rx, ry, 2, (245, 158, 11, 255))
            
    # Top Crossbeams (Kasagi & Nuki)
    c.draw_polygon([(30, 50), (226, 50), (216, 32), (40, 32)], (20, 25, 35, 255))
    c.draw_line(45, 68, 211, 68, pillar_col, thick=8)
    
    if not damaged:
        # Emerald Chi Shield Ward Active
        c.draw_glow(128, 150, 75, (0, 230, 153, 140))
        c.draw_circle(128, 150, 30, (15, 23, 42, 255), border_col=(0, 230, 153, 255), border_w=3)
        # Ward Rune
        c.draw_line(128, 132, 128, 168, (0, 230, 153, 255), thick=3)
        c.draw_line(114, 150, 142, 150, (0, 230, 153, 255), thick=3)
        c.draw_circle(128, 150, 6, (255, 255, 255, 255))
    else:
        # Breached Gate: Cracks, Broken Ward, Smoke
        c.draw_glow(128, 150, 70, (239, 68, 68, 120))
        # Jagged fracture lines through portcullis
        c.draw_line(95, 85, 120, 130, (239, 68, 68, 255), thick=4)
        c.draw_line(120, 130, 110, 165, (239, 68, 68, 255), thick=4)
        c.draw_line(110, 165, 145, 220, (239, 68, 68, 255), thick=5)
        # Pillar crack
        c.draw_line(55, 120, 77, 145, (10, 10, 10, 255), thick=4)
        # Shattered Ward Seal
        c.draw_circle(128, 150, 30, (30, 10, 15, 255), border_col=(239, 68, 68, 255), border_w=2)
        c.draw_line(116, 138, 140, 162, (239, 68, 68, 255), thick=4)
    
    c.save_png(path)


def generate_coin_gold(path):
    c = PNGCanvas(256, 256)
    # Shimmering Golden Halo
    c.draw_glow(128, 128, 115, (245, 158, 11, 140))
    c.draw_glow(128, 128, 85, (254, 240, 138, 180))
    
    # Outer Coin Rim (Ninja Mon Coin)
    c.draw_circle(128, 128, 95, (180, 83, 9, 255)) # Dark copper edge
    c.draw_circle(128, 128, 90, (245, 158, 11, 255)) # Rich gold face
    c.draw_circle(128, 128, 80, (251, 191, 36, 255)) # Bright gold inner ring
    
    # Embossed rim bevel
    for ang in range(0, 360, 30):
        rad = math.radians(ang)
        x = 128 + math.cos(rad) * 85
        y = 128 + math.sin(rad) * 85
        c.draw_circle(x, y, 3, (254, 249, 195, 255))
        
    # Square Center Hole (Traditional Japanese Coin)
    c.draw_rect(106, 106, 44, 44, (180, 83, 9, 255))
    c.draw_rect(110, 110, 36, 36, (7, 10, 17, 255)) # Transparent/Void center
    
    # Kanji / Shinobi Mon Engravings (Top, Bottom, Left, Right)
    c.draw_line(128, 55, 128, 85, (146, 64, 14, 255), thick=5)
    c.draw_line(116, 68, 140, 68, (146, 64, 14, 255), thick=4)
    c.draw_line(128, 171, 128, 201, (146, 64, 14, 255), thick=5)
    c.draw_line(116, 188, 140, 188, (146, 64, 14, 255), thick=4)
    c.draw_line(55, 128, 85, 128, (146, 64, 14, 255), thick=5)
    c.draw_line(171, 128, 201, 128, (146, 64, 14, 255), thick=5)
    
    # Dynamic Specular Light Glint (Top left edge)
    c.draw_circle(85, 75, 12, (255, 255, 255, 230))
    c.save_png(path)


def generate_chest(path, tier='bamboo'):
    c = PNGCanvas(256, 256)
    
    # Tier palettes
    if tier == 'bamboo':
        body_col = (130, 85, 45, 255)
        trim_col = (75, 85, 99, 255)
        glow_col = (100, 116, 139, 80)
        lock_col = (209, 213, 219, 255)
    elif tier == 'jade':
        body_col = (13, 148, 136, 255)
        trim_col = (20, 184, 166, 255)
        glow_col = (0, 230, 153, 150)
        lock_col = (254, 240, 138, 255)
    elif tier == 'shadow':
        body_col = (30, 27, 75, 255)
        trim_col = (126, 34, 206, 255)
        glow_col = (168, 85, 247, 160)
        lock_col = (239, 68, 68, 255)
    else: # mythic
        body_col = (180, 83, 9, 255)
        trim_col = (245, 158, 11, 255)
        glow_col = (245, 158, 11, 200)
        lock_col = (239, 68, 68, 255)
        
    c.draw_glow(128, 145, 100, glow_col)
    
    # Lower Chest Body
    c.draw_rect(45, 130, 166, 85, (20, 20, 25, 255))
    c.draw_rect(50, 135, 156, 75, body_col)
    
    # Metal Corner Brackets and Straps
    c.draw_rect(45, 130, 20, 85, trim_col)
    c.draw_rect(191, 130, 20, 85, trim_col)
    c.draw_rect(118, 130, 20, 85, trim_col) # center strap
    
    # Upper Lid (Curved Barrel Vault)
    c.draw_polygon([(35, 130), (221, 130), (205, 75), (51, 75)], (20, 20, 25, 255))
    c.draw_polygon([(40, 126), (216, 126), (200, 80), (56, 80)], body_col)
    # Lid Metal Straps
    c.draw_polygon([(40, 126), (62, 126), (72, 80), (56, 80)], trim_col)
    c.draw_polygon([(194, 126), (216, 126), (200, 80), (184, 80)], trim_col)
    c.draw_polygon([(117, 126), (139, 126), (135, 80), (121, 80)], trim_col)
    
    # Center Lock Clasp & Gem
    c.draw_circle(128, 135, 16, (20, 20, 25, 255))
    c.draw_circle(128, 135, 13, lock_col)
    c.draw_circle(128, 135, 6, (255, 255, 255, 255) if tier != 'mythic' else (239, 68, 68, 255))
    
    c.save_png(path)


def main():
    print("Generating 2D Ninja Game Sprites...")
    generate_ninja_avatar("assets/game/characters/ninja_avatar.png")
    
    generate_boss_doomscroll("assets/game/villains/boss_doomscroll.png")
    generate_boss_procrastination("assets/game/villains/boss_procrastination.png")
    generate_boss_sloth("assets/game/villains/boss_sloth.png")
    generate_boss_akuma("assets/game/villains/boss_akuma.png")
    
    generate_tenshu_t1("assets/game/castle/tenshu_t1.png")
    generate_tenshu_t2("assets/game/castle/tenshu_t2.png")
    generate_tenshu_t3("assets/game/castle/tenshu_t3.png")
    generate_forge_building("assets/game/castle/forge_building.png")
    generate_springs_building("assets/game/castle/springs_building.png")
    generate_gates("assets/game/castle/gates_intact.png", damaged=False)
    generate_gates("assets/game/castle/gates_damaged.png", damaged=True)
    
    generate_coin_gold("assets/game/items/coin_gold.png")
    generate_chest("assets/game/items/chest_bamboo.png", "bamboo")
    generate_chest("assets/game/items/chest_jade.png", "jade")
    generate_chest("assets/game/items/chest_shadow.png", "shadow")
    generate_chest("assets/game/items/chest_mythic.png", "mythic")
    print("All 16 game sprites generated successfully!")

if __name__ == "__main__":
    main()
