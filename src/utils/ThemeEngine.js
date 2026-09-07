import { FastAverageColor } from 'fast-average-color';

const fac = new FastAverageColor();

// Helper to convert rgb string "rgb(r,g,b)" to [r,g,b]
function parseRgb(rgbStr) {
  const match = rgbStr.match(/\d+/g);
  return match ? [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])] : [0,0,0];
}

// Calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Blend two colors by a ratio
function blendColors(c1, c2, ratio) {
  return [
    Math.round(c1[0] * (1 - ratio) + c2[0] * ratio),
    Math.round(c1[1] * (1 - ratio) + c2[1] * ratio),
    Math.round(c1[2] * (1 - ratio) + c2[2] * ratio)
  ];
}

export async function applyDynamicTheme(imageUrl) {
  if (!imageUrl) {
    resetTheme();
    return;
  }

  try {
    // fast-average-color automatically downscales via canvas internally
    const color = await fac.getColorAsync(imageUrl, { algorithm: 'dominant' });
    let [r, g, b] = color.value;

    // Clamp luminance to ensure text readability
    let lum = getLuminance(r, g, b);
    const MAX_LUM = 0.15; // Extremely dark threshold for background
    
    if (lum > MAX_LUM) {
      // Darken the color proportionally
      const scale = MAX_LUM / lum;
      r = Math.round(r * scale);
      g = Math.round(g * scale);
      b = Math.round(b * scale);
    }

    // Blend with absolute black (--bg-primary base #0a0a0a) at a 50% ratio
    const baseColor = [10, 10, 10];
    const finalColor = blendColors(baseColor, [r, g, b], 0.6);

    // Inject into CSS variables
    document.documentElement.style.setProperty('--theme-dynamic', `rgb(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]})`);
  } catch (err) {
    console.error('Theme extraction failed:', err);
    resetTheme();
  }
}

export function resetTheme() {
  document.documentElement.style.setProperty('--theme-dynamic', 'var(--bg-primary)');
}
