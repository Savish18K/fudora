import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WIDTH = 640;
const HEIGHT = 360;
const FPS = 24;
const FRAMES_PER_CLIP = 72; // 3.0 seconds @ 24fps

const TEMP_MEDIA_DIR =
  '/app/applet/.aistudio/artifacts/brain/1d4d2f16-5d3f-407d-a9e9-14e90c87607d/.tempmediaStorage';
const DISHES_DIR = '/app/applet/public/assets/dishes';
const VIDEOS_DIR = '/app/applet/public/assets/videos';
const VIDEOS_360_DIR = '/app/applet/public/assets/videos/360';
const AISTUDIO_DIR = '/app/applet/public/assets/aistudio';

fs.mkdirSync(VIDEOS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_360_DIR, { recursive: true });
fs.mkdirSync(AISTUDIO_DIR, { recursive: true });

function decodeImageToRGB(imagePath, w = WIDTH, h = HEIGHT) {
  const res = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      imagePath,
      '-vf',
      `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    { maxBuffer: w * h * 4 }
  );
  if (res.status !== 0 || !res.stdout || res.stdout.length < w * h * 3) {
    const fallback = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      fallback[i * 3] = 34;
      fallback[i * 3 + 1] = 44;
      fallback[i * 3 + 2] = 56;
    }
    return fallback;
  }
  return res.stdout;
}

// Authentic Vexmo 3D Slate Menu Book frames from .tempmediaStorage
const BOOK_COVER_FRAME = path.join(TEMP_MEDIA_DIR, 'media_1794420699809_de0050d6.jpg');
const PAGE_FLIP_MID_1 = path.join(TEMP_MEDIA_DIR, 'media_1794420724102_0d77306b.jpg');
const PAGE_FLIP_MID_2 = path.join(TEMP_MEDIA_DIR, 'media_1794420725855_8b8358f8.jpg');
const SLATE_SPREAD_BASE = path.join(TEMP_MEDIA_DIR, 'media_1794420701030_a5690bdf.jpg');

const AUTHENTIC_VEXMO_POPUP_FRAMES = {
  club_sandwich: path.join(TEMP_MEDIA_DIR, 'media_1794420701030_a5690bdf.jpg'),
  loaded_fries: path.join(TEMP_MEDIA_DIR, 'media_1794420702580_26532bce.jpg'),
  prawn_skewers: path.join(TEMP_MEDIA_DIR, 'media_1794420725489_ef7175c1.jpg'),
  blue_lagoon: path.join(TEMP_MEDIA_DIR, 'media_1794420705325_d89a6ca8.jpg'),
  belgian_waffles: path.join(TEMP_MEDIA_DIR, 'media_1794420706682_2c1f30c8.jpg'),
  thai_curry: path.join(TEMP_MEDIA_DIR, 'media_1794420722442_736a5658.jpg'),
};

const DISH_LIST = [
  { key: 'wagyu_burger', hot: true, pour: false, drink: false },
  { key: 'pasta_varieties', hot: true, pour: false, drink: false },
  { key: 'truffle_italian', hot: true, pour: false, drink: false },
  { key: 'chicken_wings', hot: true, pour: true, drink: false },
  { key: 'roasted_chicken', hot: true, pour: false, drink: false },
  { key: 'mediterranean_salad', hot: false, pour: false, drink: false },
  { key: 'royal_faluda', hot: false, pour: true, drink: true },
  { key: 'artisan_ice_cream', hot: false, pour: true, drink: false },
  { key: 'fresh_juices', hot: false, pour: false, drink: true },
  { key: 'gourmet_milkshakes', hot: false, pour: true, drink: true },
  { key: 'barista_oat_milk', hot: false, pour: false, drink: true },
  { key: 'bircher_muesli', hot: false, pour: true, drink: false },
  { key: 'mango_chia_pudding', hot: false, pour: false, drink: false },
  { key: 'bao_buns', hot: true, pour: false, drink: false },
  { key: 'thai_curry', hot: true, pour: false, drink: false },
  { key: 'sri_lankan_koththu', hot: true, pour: false, drink: false },
  { key: 'malabar_parota', hot: true, pour: false, drink: false },
  { key: 'szechuan_chinese', hot: true, pour: false, drink: false },
  { key: 'club_sandwich', hot: true, pour: false, drink: false },
  { key: 'loaded_fries', hot: true, pour: true, drink: false },
  { key: 'prawn_skewers', hot: true, pour: false, drink: false },
  { key: 'blue_lagoon', hot: false, pour: false, drink: true },
  { key: 'molten_lava_dessert', hot: true, pour: true, drink: false },
  { key: 'belgian_waffles', hot: true, pour: true, drink: false },
];

// Create a clean photorealistic empty open 3D slate menu book spread from the authentic Vexmo frames
// Preserves the real 3D perspective slate pages, left/right printed menu columns, and warm café bokeh,
// while 100% clearing the center pop-up zone to a clean slate page surface ready for any dish to pop up!
function createPhotorealisticEmptySlateSpread(spreadRefBuf, coverRefBuf) {
  const out = Buffer.from(spreadRefBuf);
  for (let y = 0; y < HEIGHT; y++) {
    const ny = y / HEIGHT;
    for (let x = 0; x < WIDTH; x++) {
      const nx = x / WIDTH;
      const idx = (y * WIDTH + x) * 3;

      // Desaturate only the orange stamp pixels on the far left (no boxy rectangle!)
      if (nx < 0.27 && ny > 0.28 && ny < 0.54) {
        const r = out[idx];
        const g = out[idx + 1];
        const b = out[idx + 2];
        if (r > g + 22 && r > b + 35) {
          out[idx] = Math.round(g * 0.88);
          out[idx + 1] = g;
          out[idx + 2] = Math.min(255, Math.round(g * 1.12));
        }
      }

      // Completely clear the center sandwich region (100% opaque inside dist < 0.74, smooth feather 0.74..1.0)
      const cx = (nx - 0.55) / 0.34;
      const cy = (ny - 0.45) / 0.45;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < 1.0) {
        const blend =
          dist < 0.74
            ? 1.0
            : Math.pow(Math.max(0, 1.0 - (dist - 0.74) / 0.26), 1.5);
        let cleanR, cleanG, cleanB;
        if (ny < 0.21) {
          // Top warm café bokeh from coverRefBuf
          cleanR = coverRefBuf[idx];
          cleanG = coverRefBuf[idx + 1];
          cleanB = coverRefBuf[idx + 2];
        } else if (ny < 0.25) {
          // Smooth horizon transition between café bokeh and top edge of open 3D slate book
          const tH = (ny - 0.21) / 0.04;
          const slateR = 62;
          const slateG = 74;
          const slateB = 88;
          cleanR = Math.round(coverRefBuf[idx] * (1 - tH) + slateR * tH);
          cleanG = Math.round(coverRefBuf[idx + 1] * (1 - tH) + slateG * tH);
          cleanB = Math.round(coverRefBuf[idx + 2] * (1 - tH) + slateB * tH);
        } else {
          // Smooth 3D slate page gradient + central book spine crease matching the open Vexmo slate menu book
          const spineDip = Math.exp(-Math.pow((nx - 0.48) / 0.045, 2)) * 0.16;
          const slateGrad =
            0.74 + (ny - 0.25) * 0.36 - Math.abs(nx - 0.52) * 0.14 - spineDip;
          cleanR = Math.round(74 * slateGrad);
          cleanG = Math.round(88 * slateGrad);
          cleanB = Math.round(104 * slateGrad);
        }
        out[idx] = Math.round(out[idx] * (1 - blend) + cleanR * blend);
        out[idx + 1] = Math.round(out[idx + 1] * (1 - blend) + cleanG * blend);
        out[idx + 2] = Math.round(out[idx + 2] * (1 - blend) + cleanB * blend);
      }
    }
  }
  return out;
}

// Clean any orange stamp ink on the left of authentic Vexmo pop-up frames without drawing any box
function cleanAuthenticPopUpFrame(buf) {
  const out = Buffer.from(buf);
  for (let y = Math.round(HEIGHT * 0.28); y < Math.round(HEIGHT * 0.54); y++) {
    for (let x = 0; x < Math.round(WIDTH * 0.27); x++) {
      const idx = (y * WIDTH + x) * 3;
      const r = out[idx];
      const g = out[idx + 1];
      const b = out[idx + 2];
      if (r > g + 22 && r > b + 35) {
        out[idx] = Math.round(g * 0.88);
        out[idx + 1] = g;
        out[idx + 2] = Math.min(255, Math.round(g * 1.12));
      }
    }
  }
  return out;
}

// Render a single frame of the Photorealistic Vexmo-style 3D Popping-Up Slate Menu Book Video
function renderPopUpFrame(
  outBuf,
  emptySlateBuf,
  flipMid1Buf,
  flipMid2Buf,
  dishBuf,
  authenticPopBuf,
  frameIdx,
  totalFrames,
  options
) {
  const t = frameIdx / totalFrames; // 0.0 to 1.0

  // Subtle handheld café camera motion
  const camShiftX = Math.round(Math.sin(t * Math.PI * 2) * 4);
  const camShiftY = Math.round(Math.cos(t * Math.PI * 2) * 2);

  // PHASE 1: Photorealistic 3D Slate Menu Page Flipping Down (t = 0.0 to 0.22)
  // Uses the actual Vexmo flipping slate page frames (flipMid1Buf & flipMid2Buf) + perspective fold!
  let flipFactor = 1.0;
  if (t < 0.22) {
    flipFactor = t / 0.22; // 0 -> 1
  } else if (t > 0.90) {
    flipFactor = Math.max(0, 1.0 - (t - 0.90) / 0.10);
  }

  // Fill base with empty photorealistic 3D slate menu spread (or blend with flipping page during page turn)
  for (let y = 0; y < HEIGHT; y++) {
    const sy = Math.max(0, Math.min(HEIGHT - 1, y + camShiftY));
    for (let x = 0; x < WIDTH; x++) {
      const sx = Math.max(0, Math.min(WIDTH - 1, x + camShiftX));
      const dstIdx = (y * WIDTH + x) * 3;
      const srcIdx = (sy * WIDTH + sx) * 3;

      if (flipFactor < 0.95) {
        const flipBuf = flipFactor < 0.5 ? flipMid2Buf : flipMid1Buf;
        const wFlip = Math.sin((1.0 - flipFactor) * Math.PI * 0.5);
        outBuf[dstIdx] = Math.round(
          emptySlateBuf[srcIdx] * (1 - wFlip * 0.75) + flipBuf[srcIdx] * (wFlip * 0.75)
        );
        outBuf[dstIdx + 1] = Math.round(
          emptySlateBuf[srcIdx + 1] * (1 - wFlip * 0.75) + flipBuf[srcIdx + 1] * (wFlip * 0.75)
        );
        outBuf[dstIdx + 2] = Math.round(
          emptySlateBuf[srcIdx + 2] * (1 - wFlip * 0.75) + flipBuf[srcIdx + 2] * (wFlip * 0.75)
        );
      } else {
        outBuf[dstIdx] = emptySlateBuf[srcIdx];
        outBuf[dstIdx + 1] = emptySlateBuf[srcIdx + 1];
        outBuf[dstIdx + 2] = emptySlateBuf[srcIdx + 2];
      }
    }
  }

  // PHASE 2: 3D FOOD POPPING UP VERTICALLY OUT OF THE SLATE MENU PAGE
  // Starts rising at t = 0.08, springs to full 3D upright height at t = 0.32, holds with 3D motion until t = 0.90
  let popProgress = 0.0;
  if (t >= 0.08 && t <= 0.90) {
    const raw = Math.min(1.0, (t - 0.08) / 0.24);
    popProgress =
      raw < 1.0
        ? 1.0 - Math.pow(1.0 - raw, 2.5) * Math.cos(raw * Math.PI * 1.25)
        : 1.0 + Math.sin((t - 0.32) * Math.PI * 3.5) * 0.015;
  } else if (t > 0.90) {
    popProgress = Math.max(0.0, 1.0 - (t - 0.90) / 0.10);
  }

  if (popProgress > 0.02) {
    // If this dish has an authentic Vexmo 3D Pop-Up slate frame (Club Sandwich, Loaded Fries, Prawn Skewers, Blue Lagoon, Belgian Waffles, Thai Curry),
    // pop the authentic 3D dish up vertically from the slate book crease!
    const anchorBottomY = Math.round(HEIGHT * 0.85) - camShiftY;
    const anchorCenterX = Math.round(WIDTH * 0.53) - camShiftX;

    // 1. Cast realistic soft dark shadow on the lower-left slate menu page as the food pops up
    const shadowCenterX = anchorCenterX - Math.round(35 * Math.min(1, popProgress));
    const shadowCenterY = anchorBottomY - Math.round(HEIGHT * 0.12);
    const shadowRx = Math.round(WIDTH * 0.28 * Math.min(1, popProgress));
    const shadowRy = Math.round(HEIGHT * 0.11 * Math.min(1, popProgress));

    if (shadowRx > 4 && shadowRy > 2) {
      for (
        let y = Math.max(0, shadowCenterY - shadowRy);
        y <= Math.min(HEIGHT - 1, shadowCenterY + shadowRy);
        y++
      ) {
        const dy = (y - shadowCenterY) / shadowRy;
        for (
          let x = Math.max(0, shadowCenterX - shadowRx);
          x <= Math.min(WIDTH - 1, shadowCenterX + shadowRx);
          x++
        ) {
          const dx = (x - shadowCenterX) / shadowRx;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1.0) {
            const dark = Math.pow(1.0 - d2, 1.5) * 0.58 * Math.min(1, popProgress);
            const idx = (y * WIDTH + x) * 3;
            outBuf[idx] = Math.round(outBuf[idx] * (1 - dark));
            outBuf[idx + 1] = Math.round(outBuf[idx + 1] * (1 - dark));
            outBuf[idx + 2] = Math.round(outBuf[idx + 2] * (1 - dark));
          }
        }
      }
    }

    if (authenticPopBuf) {
      // Vertically hinge-pop the authentic Vexmo 3D dish out of the slate page!
      const popFullH = Math.round(HEIGHT * 0.78);
      const curH = Math.max(6, Math.round(popFullH * popProgress));
      const topY = anchorBottomY - curH;

      for (let y = Math.max(0, topY); y < Math.min(HEIGHT, anchorBottomY); y++) {
        const ny = (y - topY) / Math.max(1, curH); // 0 at top -> 1 at bottom crease
        const srcY = Math.max(
          0,
          Math.min(HEIGHT - 1, Math.round((anchorBottomY - popFullH) + ny * popFullH))
        );
        for (let x = 0; x < WIDTH; x++) {
          const nx = x / WIDTH;
          // Soft radial mask around the popped-up 3D food on the slate page
          const dx = (nx - 0.54) / 0.36;
          const dy = (ny - 0.55) / 0.52;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 1.0) {
            const alpha = d < 0.68 ? 1.0 : Math.max(0, 1.0 - (d - 0.68) / 0.32);
            const sx = Math.max(0, Math.min(WIDTH - 1, x + camShiftX));
            const srcIdx = (srcY * WIDTH + sx) * 3;
            const dstIdx = (y * WIDTH + x) * 3;
            outBuf[dstIdx] = Math.round(
              outBuf[dstIdx] * (1 - alpha) + authenticPopBuf[srcIdx] * alpha
            );
            outBuf[dstIdx + 1] = Math.round(
              outBuf[dstIdx + 1] * (1 - alpha) + authenticPopBuf[srcIdx + 1] * alpha
            );
            outBuf[dstIdx + 2] = Math.round(
              outBuf[dstIdx + 2] * (1 - alpha) + authenticPopBuf[srcIdx + 2] * alpha
            );
          }
        }
      }
    } else {
      // Composite any of the 24 dishes popping up vertically directly out of the photorealistic slate menu page!
      // NO yellow/orange rings or boxy borders — feathered organic 3D food silhouette sitting directly on the slate page!
      const fullW = Math.round(WIDTH * 0.58);
      const fullH = Math.round(HEIGHT * 0.68);
      const curH = Math.max(8, Math.round(fullH * popProgress));
      const curW = Math.max(24, Math.round(fullW * (0.78 + 0.22 * Math.min(1, popProgress))));
      const topY = anchorBottomY - curH;
      const leftX = anchorCenterX - Math.round(curW / 2);
      const parallaxShift = Math.sin(t * Math.PI * 2) * 0.022;

      for (let y = Math.max(0, topY); y < Math.min(HEIGHT, anchorBottomY); y++) {
        const ny = (y - topY) / Math.max(1, curH); // 0 top .. 1 bottom
        for (let x = Math.max(0, leftX); x < Math.min(WIDTH, leftX + curW); x++) {
          const nx = (x - leftX) / Math.max(1, curW); // 0 left .. 1 right
          const cx = (nx - 0.5) * 2.0;
          const cy = (ny - 0.54) * 2.0;
          const widthEnv = options.drink
            ? 0.66 + 0.18 * Math.sin(ny * Math.PI)
            : 0.86 + 0.20 * Math.sin(ny * Math.PI);
          const adjCx = cx / widthEnv;
          const dist = Math.sqrt(adjCx * adjCx + cy * cy);

          if (dist < 0.98) {
            const domeZ = Math.sqrt(Math.max(0, 1.0 - dist * dist));
            const sampleU = Math.max(
              0.06,
              Math.min(0.94, 0.12 + nx * 0.76 + parallaxShift * domeZ)
            );
            const sampleV = Math.max(0.06, Math.min(0.94, 0.10 + ny * 0.80));
            const sx = Math.floor(sampleU * WIDTH);
            const sy = Math.floor(sampleV * HEIGHT);
            const srcIdx = (sy * WIDTH + sx) * 3;

            const r = dishBuf[srcIdx];
            const g = dishBuf[srcIdx + 1];
            const b = dishBuf[srcIdx + 2];
            const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

            // Suppress dark background corners of the food photo so only the bright 3D plated dish & food pop up on the slate page
            let edgeAlpha =
              dist < 0.62 ? 1.0 : Math.max(0, 1.0 - (dist - 0.62) / 0.36);
            edgeAlpha = edgeAlpha * edgeAlpha * (3 - 2 * edgeAlpha);
            if (dist > 0.48 && luma < 0.18) {
              edgeAlpha *= luma / 0.18;
            }

            const dstIdx = (y * WIDTH + x) * 3;
            const light = 1.0 + domeZ * 0.10;
            const fr = Math.min(255, Math.round(r * light));
            const fg = Math.min(255, Math.round(g * light));
            const fb = Math.min(255, Math.round(b * light));

            outBuf[dstIdx] = Math.round(outBuf[dstIdx] * (1 - edgeAlpha) + fr * edgeAlpha);
            outBuf[dstIdx + 1] = Math.round(
              outBuf[dstIdx + 1] * (1 - edgeAlpha) + fg * edgeAlpha
            );
            outBuf[dstIdx + 2] = Math.round(
              outBuf[dstIdx + 2] * (1 - edgeAlpha) + fb * edgeAlpha
            );
          }
        }
      }
    }

    // 2. Animated Curling White 3D Steam Plumes Rising Above Hot Dishes
    if (options.hot && popProgress > 0.5) {
      const steamOpacity = Math.min(1.0, (popProgress - 0.5) * 2.0);
      const steamBaseY = Math.round(HEIGHT * 0.42);
      const steamTopY = 12;

      for (let plume = 0; plume < 3; plume++) {
        const plumeX = anchorCenterX + (plume - 1) * 36;
        for (let y = steamTopY; y < steamBaseY; y++) {
          const hFrac = 1.0 - (y - steamTopY) / Math.max(1, steamBaseY - steamTopY);
          const waveX =
            plumeX + Math.sin(hFrac * 5.2 - t * Math.PI * 6 + plume * 2.0) * (9 + hFrac * 15);
          const rad = 8 + hFrac * 16;
          const vFade = Math.sin(hFrac * Math.PI) * steamOpacity * 0.36;

          for (
            let x = Math.max(0, Math.round(waveX - rad));
            x <= Math.min(WIDTH - 1, Math.round(waveX + rad));
            x++
          ) {
            const dx = Math.abs(x - waveX) / rad;
            if (dx < 1.0) {
              const sA = (1.0 - dx * dx) * vFade;
              const idx = (y * WIDTH + x) * 3;
              outBuf[idx] = Math.min(255, Math.round(outBuf[idx] + (245 - outBuf[idx]) * sA));
              outBuf[idx + 1] = Math.min(
                255,
                Math.round(outBuf[idx + 1] + (248 - outBuf[idx + 1]) * sA)
              );
              outBuf[idx + 2] = Math.min(
                255,
                Math.round(outBuf[idx + 2] + (255 - outBuf[idx + 2]) * sA)
              );
            }
          }
        }
      }
    }

    // 3. Animated Glossy Chocolate / Glaze Pour from Above (Desserts / Wings / Fries)
    if (options.pour && popProgress > 0.6 && t < 0.84) {
      const pourBottomY = Math.round(HEIGHT * 0.46);
      const pourX = anchorCenterX + Math.round(Math.sin(t * Math.PI * 4) * 3);
      for (let y = 0; y < pourBottomY; y++) {
        const halfW = y < pourBottomY - 10 ? 3 : 5;
        for (let x = pourX - halfW; x <= pourX + halfW; x++) {
          if (x >= 0 && x < WIDTH) {
            const dx = Math.abs(x - pourX) / Math.max(1, halfW);
            const idx = (y * WIDTH + x) * 3;
            const isSpec = dx < 0.35;
            outBuf[idx] = isSpec ? 205 : 54;
            outBuf[idx + 1] = isSpec ? 140 : 25;
            outBuf[idx + 2] = isSpec ? 82 : 12;
          }
        }
      }
    }
  }
}

// Render a single frame of the Photorealistic 3D 360° Horizontal Y-Axis Turntable Video
// The food stays 100% UPRIGHT (`v = ny`) and centered on the rotating 3D obsidian & brushed-gold
// 360° turntable pedestal while rotating around the vertical Y-axis!
function render360TurntableFrame(outBuf, dishBuf, frameIdx, totalFrames, options) {
  const t = frameIdx / totalFrames; // 0.0 to 1.0
  const angle = t * Math.PI * 2; // 0 to 360 deg around the VERTICAL Y-axis

  const cx = WIDTH * 0.5;
  const cy = HEIGHT * 0.50;

  // 1. Pure Luxury Obsidian & Warm Golden Bokeh 3D Studio Backdrop (no ghost duplicate of the dish!)
  const orb1X = cx + Math.sin(angle) * 140;
  const orb1Y = HEIGHT * 0.24;
  const orb2X = cx - Math.sin(angle) * 155;
  const orb2Y = HEIGHT * 0.30;

  for (let y = 0; y < HEIGHT; y++) {
    const dy = (y - cy) / HEIGHT;
    for (let x = 0; x < WIDTH; x++) {
      const dx = (x - cx) / WIDTH;
      const r2 = dx * dx + dy * dy;
      const centerGlow = Math.max(0, 1.0 - r2 * 2.5);

      // Orbiting warm café bokeh lights in the 360° studio background
      const d1 = ((x - orb1X) * (x - orb1X) + (y - orb1Y) * (y - orb1Y)) / (52 * 52);
      const d2 = ((x - orb2X) * (x - orb2X) + (y - orb2Y) * (y - orb2Y)) / (44 * 44);
      const bokeh = Math.exp(-d1) * 0.38 + Math.exp(-d2) * 0.28;

      const dstIdx = (y * WIDTH + x) * 3;
      outBuf[dstIdx] = Math.min(255, Math.round(11 + centerGlow * 34 + bokeh * 185));
      outBuf[dstIdx + 1] = Math.min(255, Math.round(15 + centerGlow * 26 + bokeh * 130));
      outBuf[dstIdx + 2] = Math.min(255, Math.round(24 + centerGlow * 18 + bokeh * 55));
    }
  }

  // 2. 3D Rotating Obsidian & Brushed-Gold Turntable Pedestal Base (at bottom of stage)
  const platterCenterY = Math.round(HEIGHT * 0.80);
  const platterRx = Math.round(WIDTH * 0.38);
  const platterRy = Math.round(HEIGHT * 0.14);

  for (let y = platterCenterY - platterRy; y <= Math.min(HEIGHT - 1, platterCenterY + platterRy + 12); y++) {
    for (let x = Math.round(cx - platterRx - 6); x <= Math.round(cx + platterRx + 6); x++) {
      if (x < 0 || x >= WIDTH) continue;
      const dx = (x - cx) / platterRx;
      const dy = (y - platterCenterY) / platterRy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * WIDTH + x) * 3;

      if (d <= 1.04) {
        const ptAngle = Math.atan2(dy, dx) + angle;
        const tick = Math.cos(ptAngle * 36) > 0.72;

        if (d > 0.94) {
          outBuf[idx] = tick ? 255 : 214;
          outBuf[idx + 1] = tick ? 215 : 152;
          outBuf[idx + 2] = tick ? 95 : 34;
        } else if (d > 0.89) {
          outBuf[idx] = 16;
          outBuf[idx + 1] = 22;
          outBuf[idx + 2] = 32;
        } else {
          const spec = Math.max(0, Math.cos(ptAngle)) * 0.30;
          outBuf[idx] = Math.round(26 + spec * 68);
          outBuf[idx + 1] = Math.round(33 + spec * 62);
          outBuf[idx + 2] = Math.round(46 + spec * 55);
        }
      }
    }
  }

  // 3. UPRIGHT 3D Volumetric Dish Rotating 360° Around the Vertical Y-Axis
  // Centered directly on the turntable pedestal (`cx`), never sliding off-center and never tipping sideways!
  const dishLiftY = Math.round(Math.sin(angle * 2) * 5);
  const dishW = Math.round(WIDTH * 0.58);
  const dishH = Math.round(HEIGHT * 0.70);
  const dishBottomY = platterCenterY + 10 + dishLiftY;
  const dishTopY = dishBottomY - dishH;

  // 3D horizontal turntable rotation perspective foreshortening around the Y-axis
  const horizPerspective = 0.88 + 0.12 * Math.cos(angle * 2);
  const curDishW = Math.round(dishW * horizPerspective);
  const dishLeftX = Math.round(cx - curDishW / 2);

  // Drop shadow on the turntable surface directly under the upright dish
  const shRx = Math.round(curDishW * 0.42);
  const shRy = Math.round(platterRy * 0.68);
  for (let y = platterCenterY - shRy; y <= Math.min(HEIGHT - 1, platterCenterY + shRy); y++) {
    const dy = (y - platterCenterY) / Math.max(1, shRy);
    for (let x = Math.round(cx - shRx); x <= Math.round(cx + shRx); x++) {
      const dx = (x - cx) / Math.max(1, shRx);
      const d2 = dx * dx + dy * dy;
      if (d2 < 1.0) {
        const dark = (1.0 - d2) * 0.72;
        const idx = (y * WIDTH + x) * 3;
        outBuf[idx] = Math.round(outBuf[idx] * (1 - dark));
        outBuf[idx + 1] = Math.round(outBuf[idx + 1] * (1 - dark));
        outBuf[idx + 2] = Math.round(outBuf[idx + 2] * (1 - dark));
      }
    }
  }

  // Render the Upright 3D Food Centered on the Pedestal with 360° Cylindrical Y-Axis Rotation & Orbiting Rim Light
  const rimLightDirX = Math.sin(angle);
  const cylTwist = Math.sin(angle) * 0.045; // Subtle 3D cylindrical curvature parallax while staying centered

  for (let y = Math.max(0, dishTopY); y < Math.min(HEIGHT, dishBottomY); y++) {
    const ny = (y - dishTopY) / Math.max(1, dishH); // 0 top .. 1 bottom (ALWAYS UPRIGHT!)
    for (let x = Math.max(0, dishLeftX); x < Math.min(WIDTH, dishLeftX + curDishW); x++) {
      const nx = (x - dishLeftX) / Math.max(1, curDishW); // 0 left .. 1 right
      const dx = (nx - 0.5) * 2.0; // -1 to 1 on cylinder X
      const dy = (ny - 0.52) * 2.0; // -1 to 1 on vertical Y

      const widthProfile = options.drink
        ? 0.68 + 0.18 * Math.sin(ny * Math.PI)
        : 0.88 + 0.18 * Math.sin(ny * Math.PI);
      const adjDx = dx / widthProfile;
      const dist = Math.sqrt(adjDx * adjDx + dy * dy);

      if (dist < 0.98) {
        const normalX = Math.max(-1, Math.min(1, adjDx));
        const normalZ = Math.sqrt(Math.max(0, 1.0 - normalX * normalX));

        // 3D cylindrical horizontal UV mapping (centered & upright!)
        const cylAngle = Math.asin(normalX); // -pi/2 to +pi/2 across front of 3D food cylinder
        const baseU = 0.5 + (cylAngle / Math.PI) * 0.84 + cylTwist * normalZ;
        // Smooth horizontal turnaround flip for the back half of the 360° Y-axis spin
        const flipSign = Math.cos(angle) >= 0 ? 1 : -1;
        const u = Math.max(0.06, Math.min(0.94, 0.5 + (baseU - 0.5) * flipSign));
        const v = Math.max(0.06, Math.min(0.94, 0.08 + ny * 0.84));

        const sx = Math.floor(u * WIDTH);
        const sy = Math.floor(v * HEIGHT);
        const srcIdx = (sy * WIDTH + sx) * 3;

        const r = dishBuf[srcIdx];
        const g = dishBuf[srcIdx + 1];
        const b = dishBuf[srcIdx + 2];
        const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        let alpha = dist < 0.66 ? 1.0 : Math.max(0, 1.0 - (dist - 0.66) / 0.32);
        alpha = alpha * alpha * (3 - 2 * alpha);
        if (dist > 0.48 && luma < 0.18) {
          alpha *= luma / 0.18;
        }

        // Orbiting 360° 3D studio rim lighting + specular glaze highlight
        const rimDot = Math.max(0, normalX * rimLightDirX + normalZ * 0.65);
        const rimSpec = Math.pow(rimDot, 4) * 36;
        const shade = 0.90 + normalZ * 0.16;

        const fr = Math.min(255, Math.round(r * shade + rimSpec));
        const fg = Math.min(255, Math.round(g * shade + rimSpec * 0.88));
        const fb = Math.min(255, Math.round(b * shade + rimSpec * 0.65));

        const dstIdx = (y * WIDTH + x) * 3;
        outBuf[dstIdx] = Math.round(outBuf[dstIdx] * (1 - alpha) + fr * alpha);
        outBuf[dstIdx + 1] = Math.round(outBuf[dstIdx + 1] * (1 - alpha) + fg * alpha);
        outBuf[dstIdx + 2] = Math.round(outBuf[dstIdx + 2] * (1 - alpha) + fb * alpha);
      }
    }
  }

  // 4. Rising 3D Steam Plumes on Hot Dishes in 360° Studio
  if (options.hot) {
    for (let p = 0; p < 3; p++) {
      const baseSteamX = cx + (p - 1) * 36;
      for (let y = 14; y < Math.round(HEIGHT * 0.38); y++) {
        const frac = 1.0 - (y - 14) / (HEIGHT * 0.38 - 14);
        const wx = baseSteamX + Math.sin(frac * 5 - angle * 2 + p * 2) * 14;
        const rad = 10 + frac * 14;
        const sOp = Math.sin(frac * Math.PI) * 0.30;
        for (
          let x = Math.max(0, Math.round(wx - rad));
          x <= Math.min(WIDTH - 1, Math.round(wx + rad));
          x++
        ) {
          const d = Math.abs(x - wx) / rad;
          if (d < 1.0) {
            const a = (1.0 - d * d) * sOp;
            const idx = (y * WIDTH + x) * 3;
            outBuf[idx] = Math.min(255, Math.round(outBuf[idx] + (250 - outBuf[idx]) * a));
            outBuf[idx + 1] = Math.min(255, Math.round(outBuf[idx + 1] + (248 - outBuf[idx + 1]) * a));
            outBuf[idx + 2] = Math.min(255, Math.round(outBuf[idx + 2] + (255 - outBuf[idx + 2]) * a));
          }
        }
      }
    }
  }
}

function encodeFramesToMp4(outputPath, totalFrames, renderFrameFn) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${WIDTH}x${HEIGHT}`,
      '-r',
      String(FPS),
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '21',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });

    const frameBuf = Buffer.alloc(WIDTH * HEIGHT * 3);
    let i = 0;

    function writeNext() {
      let ok = true;
      while (i < totalFrames && ok) {
        renderFrameFn(frameBuf, i, totalFrames);
        i++;
        ok = ff.stdin.write(Buffer.from(frameBuf));
      }
      if (i < totalFrames) {
        ff.stdin.once('drain', writeNext);
      } else {
        ff.stdin.end();
      }
    }

    writeNext();
  });
}

async function main() {
  console.log('Loading photorealistic Vexmo 3D slate menu book reference frames...');
  const coverRefBuf = decodeImageToRGB(BOOK_COVER_FRAME);
  const spreadRefBuf = decodeImageToRGB(SLATE_SPREAD_BASE);
  const flipMid1Buf = decodeImageToRGB(PAGE_FLIP_MID_1);
  const flipMid2Buf = decodeImageToRGB(PAGE_FLIP_MID_2);
  const emptySlateBuf = createPhotorealisticEmptySlateSpread(spreadRefBuf, coverRefBuf);

  const dishBuffers = {};
  const authenticBuffers = {};

  for (const item of DISH_LIST) {
    const jpgPath = path.join(DISHES_DIR, `${item.key}.jpg`);
    dishBuffers[item.key] = decodeImageToRGB(jpgPath);
    if (
      AUTHENTIC_VEXMO_POPUP_FRAMES[item.key] &&
      fs.existsSync(AUTHENTIC_VEXMO_POPUP_FRAMES[item.key])
    ) {
      authenticBuffers[item.key] = cleanAuthenticPopUpFrame(
        decodeImageToRGB(AUTHENTIC_VEXMO_POPUP_FRAMES[item.key])
      );
    }
  }

  console.log('Rendering 24 Photorealistic 3D Pop-Up Slate Menu Videos & 24 Upright 3D 360° Turntable Videos...');
  for (const item of DISH_LIST) {
    const popUpOut = path.join(VIDEOS_DIR, `${item.key}.mp4`);
    const turntable360Out = path.join(VIDEOS_360_DIR, `${item.key}.mp4`);
    const dishBuf = dishBuffers[item.key];
    const authBuf = authenticBuffers[item.key] || null;

    await encodeFramesToMp4(popUpOut, FRAMES_PER_CLIP, (frameBuf, fIdx, total) => {
      renderPopUpFrame(
        frameBuf,
        emptySlateBuf,
        flipMid1Buf,
        flipMid2Buf,
        dishBuf,
        authBuf,
        fIdx,
        total,
        item
      );
    });

    await encodeFramesToMp4(turntable360Out, FRAMES_PER_CLIP, (frameBuf, fIdx, total) => {
      render360TurntableFrame(frameBuf, dishBuf, fIdx, total, item);
    });
  }

  console.log('Rendering master 16-second 3D Pop-Up Menu Book Reel...');
  const masterClips = [
    'wagyu_burger',
    'pasta_varieties',
    'chicken_wings',
    'roasted_chicken',
    'mediterranean_salad',
    'royal_faluda',
    'artisan_ice_cream',
    'fresh_juices',
    'gourmet_milkshakes',
    'barista_oat_milk',
    'bircher_muesli',
    'mango_chia_pudding',
    'sri_lankan_koththu',
    'malabar_parota',
    'thai_curry',
    'molten_lava_dessert',
  ];
  const framesPerMasterSegment = 24;
  const totalMasterFrames = masterClips.length * framesPerMasterSegment;
  const masterReelOut = path.join(AISTUDIO_DIR, 'fudora_3d_menu_book.mp4');

  await encodeFramesToMp4(masterReelOut, totalMasterFrames, (frameBuf, fIdx) => {
    const segIdx = Math.min(
      masterClips.length - 1,
      Math.floor(fIdx / framesPerMasterSegment)
    );
    const localFrame = fIdx % framesPerMasterSegment;
    const key = masterClips[segIdx];
    const item = DISH_LIST.find((d) => d.key === key) || DISH_LIST[0];
    renderPopUpFrame(
      frameBuf,
      emptySlateBuf,
      flipMid1Buf,
      flipMid2Buf,
      dishBuffers[key],
      authenticBuffers[key] || null,
      localFrame,
      framesPerMasterSegment,
      item
    );
  });

  console.log('All photorealistic 3D Pop-Up Menu and 3D 360° Turntable videos generated!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
