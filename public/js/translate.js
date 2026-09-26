(function () {
    const LANG_MAP = {
        // English
        'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en', 'SG': 'en',

        // Asia
        'JP': 'ja', 'KR': 'ko', 'CN': 'zh-CN', 'TW': 'zh-TW', 'HK': 'zh-TW',
        'TH': 'th', 'ID': 'id', 'MY': 'ms', 'PH': 'tl', 'IN': 'hi',
        'PK': 'ur', 'BD': 'bn', 'VN': 'vi',

        // Europe major
        'FR': 'fr', 'DE': 'de', 'IT': 'it', 'ES': 'es', 'PT': 'pt',
        'NL': 'nl', 'BE': 'fr', 'CH': 'de', 'AT': 'de',

        // Scandinavia
        'SE': 'sv', 'NO': 'no', 'DK': 'da', 'FI': 'fi', 'IS': 'is',

        // Eastern Europe
        'PL': 'pl', 'CZ': 'cs', 'SK': 'sk', 'HU': 'hu', 'RO': 'ro',
        'BG': 'bg', 'HR': 'hr', 'SI': 'sl', 'RS': 'sr', 'BA': 'bs',
        'ME': 'sr', 'MK': 'mk',

        // Baltic
        'LT': 'lt', 'LV': 'lv', 'EE': 'et',

        // Southern Europe
        'GR': 'el', 'AL': 'sq',

        // Middle East
        'SA': 'ar', 'AE': 'ar', 'EG': 'ar', 'IQ': 'ar', 'MA': 'ar',
        'IL': 'he', 'IR': 'fa', 'AF': 'fa', 'TR': 'tr',

        // Latin America
        'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es',
        'VE': 'es', 'UY': 'es', 'PY': 'es', 'BO': 'es', 'EC': 'es',

        // Brazil
        'BR': 'pt',

        // Africa
        'ZA': 'en', 'NG': 'en', 'KE': 'en',

        // Ukraine / Russia
        'UA': 'uk', 'RU': 'ru',
    };

    // ── Overlay ──────────────────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.id = 'translate-overlay';
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:999999',
        'background:rgba(255,255,255,0.48)',
        'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'transition:opacity 0.4s ease',
        'opacity:1',
    ].join(';');

    var spinner = document.createElement('div');
    spinner.style.cssText = [
        'width:36px', 'height:36px',
        'border:3px solid #e0e0e0',
        'border-top-color:#1877f2',
        'border-radius:50%',
        'animation:_tl_spin 0.7s linear infinite',
    ].join(';');

    var style = document.createElement('style');
    style.textContent = '@keyframes _tl_spin{to{transform:rotate(360deg)}}';

    document.head.appendChild(style);
    overlay.appendChild(spinner);

    if (document.body) {
        document.body.appendChild(overlay);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            document.body.appendChild(overlay);
        });
    }

    function removeOverlay() {
        overlay.style.opacity = '0';
        setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 420);
    }

    // ── Cookie helpers ────────────────────────────────────────────────────
    function getGoogtransCookie() {
        var m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
        return m ? decodeURIComponent(m[1]) : null;
    }

    function setCookieRaw(name, value) {
        document.cookie = name + '=' + value + '; path=/; SameSite=Lax';
        var host = location.hostname;
        var parts = host.split('.');
        if (parts.length >= 2) {
            var rootDomain = parts.slice(-2).join('.');
            if (rootDomain !== host) {
                document.cookie = name + '=' + value +
                    '; path=/; domain=' + rootDomain + '; SameSite=Lax';
            }
        }
    }

    function setGoogtransCookie(lang) {
        // Google Translate expects: /source/target
        setCookieRaw('googtrans', '/en/' + lang);
    }

    // ── Fetch with timeout ────────────────────────────────────────────────
    function fetchJSON(url, timeoutMs) {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 4000);
        return fetch(url, { signal: ctrl.signal, cache: 'no-store' })
            .then(function (res) {
                clearTimeout(timer);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .catch(function (e) {
                clearTimeout(timer);
                throw e;
            });
    }

    // ── Country detection (multi-fallback, no API key) ────────────────────
    async function getCountryCode() {
        // 1) ipapi.co — free, CORS enabled
        try {
            var d1 = await fetchJSON('https://ipapi.co/json/');
            if (d1 && d1.country_code) return d1.country_code.toUpperCase();
        } catch (e) {}

        // 2) ipwho.is — free, CORS enabled
        try {
            var d2 = await fetchJSON('https://ipwho.is/');
            if (d2 && d2.country_code) return d2.country_code.toUpperCase();
        } catch (e) {}

        // 3) ipinfo.io (no token, limited)
        try {
            var d3 = await fetchJSON('https://ipinfo.io/json');
            if (d3 && d3.country) return d3.country.toUpperCase();
        } catch (e) {}

        // 4) Cloudflare trace (text, not JSON)
        try {
            var res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
            var txt = await res.text();
            var m = txt.match(/^loc=([A-Z]{2})$/m);
            if (m) return m[1].toUpperCase();
        } catch (e) {}

        // 5) Browser language fallback (e.g. "vi-VN" → VN)
        try {
            var nav = (navigator.language || '').split('-');
            if (nav.length === 2) return nav[1].toUpperCase();
        } catch (e) {}

        return '';
    }

    // ── Wait for Google Translate to finish ───────────────────────────────
    function waitForTranslation(timeout) {
        return new Promise(function (resolve) {
            var html = document.documentElement;
            if (/translated-(ltr|rtl)/.test(html.className)) return resolve();
            var timer = setTimeout(resolve, timeout || 5000);
            var obs = new MutationObserver(function () {
                if (/translated-(ltr|rtl)/.test(html.className)) {
                    clearTimeout(timer);
                    obs.disconnect();
                    resolve();
                }
            });
            obs.observe(html, { attributes: true, attributeFilter: ['class'] });
        });
    }

    // ── Main ──────────────────────────────────────────────────────────────
    async function run() {
        var existing = getGoogtransCookie();

        // Cookie already set → wait for translation, then reveal
        if (existing && existing !== '/en/' && existing !== '/en/undefined') {
            if (existing !== '/en/en') {
                await waitForTranslation(6000);
            }
            removeOverlay();
            return;
        }

        var countryCode = await getCountryCode();
        console.log('[translate] Detected country:', countryCode);

        var targetLang = countryCode ? LANG_MAP[countryCode] : null;

        if (!targetLang || targetLang === 'en') {
            if (targetLang === 'en') setGoogtransCookie('en');
            removeOverlay();
            return;
        }

        setGoogtransCookie(targetLang);
        setTimeout(function () { location.reload(); }, 80);
    }

    if (document.body) {
        run();
    } else {
        document.addEventListener('DOMContentLoaded', run);
    }
})();
