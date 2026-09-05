// ── Ad/Tracker Blocklist ──────────────────────────────────────────────────────
// Ported from Streambert's index.js (BLOCKED_HOSTS array)
// Used by streamExtractor.js to block ads in headless Puppeteer pages.

export const BLOCKED_HOSTS = [
  '*://www.google-analytics.com/*',
  '*://analytics.google.com/*',
  '*://googletagmanager.com/*',
  '*://www.googletagmanager.com/*',
  '*://googletagservices.com/*',
  '*://doubleclick.net/*',
  '*://*.doubleclick.net/*',
  '*://adservice.google.com/*',
  '*://adservice.google.de/*',
  '*://pagead2.googlesyndication.com/*',
  '*://stats.g.doubleclick.net/*',
  '*://yt3.ggpht.com/ytc/*',
  '*://fonts.googleapis.com/*',
  '*://fonts.gstatic.com/*',
  '*://googleapis.com/*',
  '*://gstatic.com/*',
  '*://cdn.adx1.com/*',
  '*://intelligenceadx.com/*',
  '*://adsco.re/*',
  '*://mc.yandex.com/*',
  '*://mc.yandex.ru/*',
  '*://bvtpk.com/*',
  '*://my.rtmark.net/*',
  '*://b7510.com/*',
  '*://gt.unbrownunflat.com/*',
  '*://im.malocacomals.com/*',
  '*://users.videasy.net/*',
  '*://nf.sixmossin.com/*',
  '*://realizationnewestfangs.com/*',
  '*://acscdn.com/*',
  '*://lt.taloseempest.com/*',
  '*://pl26708123.profitableratecpm.com/*',
  '*://preferencenail.com/*',
  '*://protrafficinspector.com/*',
  '*://s10.histats.com/*',
  '*://weirdopt.com/*',
  '*://static.cloudflareinsights.com/*',
  '*://kettledroopingcontinuation.com/*',
  '*://wayfarerorthodox.com/*',
  '*://woxaglasuy.net/*',
  '*://adeptspiritual.com/*',
  '*://www.calculating-laugh.com/*',
  '*://amavhxdlofklxjg.xyz/*',
  '*://7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd/*',
  '*://5mq.get64t9vqg8pnbex1y463o.rest/*',
  '*://usrpubtrk.com/*',
  '*://adexchangeclear.com/*',
  '*://rzjzjnavztycv.online/*',
  '*://tmstr4.cloudnestra.com/*',
  '*://tmstr4.neonhorizonworkshops.com/*',
];

/**
 * Extract hostnames from the Electron-style URL patterns for use in Puppeteer
 * request interception (which doesn't support the *://host/* glob format).
 */
const _blockedHostnames = new Set();
for (const pattern of BLOCKED_HOSTS) {
  // Pattern format: *://[*.]hostname/*
  const match = pattern.match(/^\*:\/\/\*?\.?([^/]+)/);
  if (match) _blockedHostnames.add(match[1].toLowerCase());
}

/**
 * Check if a URL should be blocked.
 * @param {string} url
 * @returns {boolean}
 */
export function isBlocked(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Direct match
    if (_blockedHostnames.has(hostname)) return true;
    // Subdomain match: check if hostname ends with .blockedHost
    for (const blocked of _blockedHostnames) {
      if (hostname.endsWith('.' + blocked)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
