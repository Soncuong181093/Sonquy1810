(function () {
    const LANG_MAP = {
        // English
        US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', SG: 'en',

        // Asia
        JP: 'ja',
        KR: 'ko',
        CN: 'zh-CN',
        TW: 'zh-TW',
        HK: 'zh-TW',
        TH: 'th',
        ID: 'id',
        MY: 'ms',
        PH: 'tl',
        IN: 'hi',
        PK: 'ur',
        BD: 'bn',

        // Europe
        FR: 'fr',
        DE: 'de',
        IT: 'it',
        ES: 'es',
        PT: 'pt',
        NL: 'nl',
        BE: 'fr',
        CH: 'de',
        AT: 'de',

        // Scandinavia
        SE: 'sv',
        NO: 'no',
        DK: 'da',
        FI: 'fi',
        IS: 'is',

        // Eastern Europe
        PL: 'pl',
        CZ: 'cs',
        SK: 'sk',
        HU: 'hu',
        RO: 'ro',
        BG: 'bg',
        HR: 'hr',
        SI: 'sl',
        RS: 'sr',
        BA: 'bs',
        ME: 'sr',
        MK: 'mk',

        // Baltic
        LT: 'lt',
        LV: 'lv',
        EE: 'et',

        // Southern Europe
        GR: 'el',
        AL: 'sq',

        // Middle East
        SA: 'ar',
        AE: 'ar',
        EG: 'ar',
        IQ: 'ar',
        MA: 'ar',
        IL: 'he',
        IR: 'fa',
        AF: 'fa',
        TR: 'tr',

        // Latin America
        MX: 'es',
        AR: 'es',
        CO: 'es',
        CL: 'es',
        PE: 'es',
        VE: 'es',
        UY: 'es',
        PY: 'es',
        BO: 'es',
        EC: 'es',

        // Brazil
        BR: 'pt',

        // Africa
        ZA: 'en',
        NG: 'en',
        KE: 'en',

        // Ukraine / Russia
        UA: 'uk',
        RU: 'ru'
    };

    // ─────────────────────────────────────────────
    // OVERLAY
    // ─────────────────────────────────────────────

    var overlay = document.createElement('div');

    overlay.id = 'translate-overlay';

    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:999999',
        'background:rgba(255,255,255,0.48)',
        'backdrop-filter:blur(6px)',
        '-webkit-backdrop-filter:blur(6px)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'transition:opacity 0.4s ease',
        'opacity:1'
    ].join(';');

    var spinner = document.createElement('div');

    spinner.style.cssText = [
        'width:36px',
        'height:36px',
        'border:3px solid #e0e0e0',
        'border-top-color:#1877f2',
        'border-radius:50%',
        'animation:_tl_spin 0.7s linear infinite'
    ].join(';');

    var style = document.createElement('style');

    style.textContent =
        '@keyframes _tl_spin{to{transform:rotate(360deg)}}';

    document.head.appendChild(style);

    overlay.appendChild(spinner);
    document.body.appendChild(overlay);

    function removeOverlay() {
        overlay.style.opacity = '0';

        setTimeout(function () {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 420);
    }

    // ─────────────────────────────────────────────
    // GOOGLE TRANSLATE COOKIE
    // ─────────────────────────────────────────────

    function getGoogtransCookie() {
        var match = document.cookie.match(
            /(?:^|;\s*)googtrans=([^;]*)/
        );

        return match
            ? decodeURIComponent(match[1])
            : null;
    }

    function setGoogtransCookie(lang) {
        var value = '/en/' + lang;

        document.cookie =
            'googtrans=' + value + '; path=/';

        var hostname = location.hostname;

        if (
            hostname &&
            hostname !== 'localhost' &&
            hostname !== '127.0.0.1'
        ) {
            document.cookie =
                'googtrans=' +
                value +
                '; path=/; domain=' +
                hostname;
        }
    }

    // ─────────────────────────────────────────────
    // FETCH WITH TIMEOUT
    // ─────────────────────────────────────────────

    async function fetchJSON(url, timeout) {
        var controller = new AbortController();

        var timer = setTimeout(function () {
            controller.abort();
        }, timeout || 5000);

        try {
            var response = await fetch(url, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(
                    'HTTP ' + response.status
                );
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }

    // ─────────────────────────────────────────────
    // GET COUNTRY FROM IP
    // ─────────────────────────────────────────────

    async function getCountryCode() {

        // API 1: ipapi.co
        try {
            var data1 = await fetchJSON(
                'https://ipapi.co/json/',
                5000
            );

            if (data1 && data1.country_code) {
                console.log(
                    '[Translate] Country:',
                    data1.country_code,
                    'IP:',
                    data1.ip || 'unknown'
                );

                return data1.country_code.toUpperCase();
            }

        } catch (e) {
            console.warn(
                '[Translate] ipapi.co failed',
                e
            );
        }

        // API 2: ipwho.is
        try {
            var data2 = await fetchJSON(
                'https://ipwho.is/',
                5000
            );

            if (
                data2 &&
                data2.success !== false &&
                data2.country_code
            ) {
                console.log(
                    '[Translate] Country:',
                    data2.country_code,
                    'IP:',
                    data2.ip || 'unknown'
                );

                return data2.country_code.toUpperCase();
            }

        } catch (e) {
            console.warn(
                '[Translate] ipwho.is failed',
                e
            );
        }

        // API 3: ipapi.com alternative
        try {
            var data3 = await fetchJSON(
                'https://ipapi.co/country/',
                5000
            );

            if (typeof data3 === 'string') {
                var country = data3.trim().toUpperCase();

                if (country.length === 2) {
                    console.log(
                        '[Translate] Country:',
                        country
                    );

                    return country;
                }
            }

        } catch (e) {
            console.warn(
                '[Translate] country API failed',
                e
            );
        }

        return '';
    }

    // ─────────────────────────────────────────────
    // WAIT GOOGLE TRANSLATE
    // ─────────────────────────────────────────────

    function waitForTranslation(timeout) {

        return new Promise(function (resolve) {

            var html = document.documentElement;

            if (
                /translated-(ltr|rtl)/.test(
                    html.className
                )
            ) {
                resolve();
                return;
            }

            var finished = false;

            var timer = setTimeout(function () {

                if (finished) return;

                finished = true;

                observer.disconnect();

                resolve();

            }, timeout || 6000);

            var observer =
                new MutationObserver(function () {

                    if (
                        /translated-(ltr|rtl)/.test(
                            html.className
                        )
                    ) {

                        if (finished) return;

                        finished = true;

                        clearTimeout(timer);

                        observer.disconnect();

                        resolve();
                    }
                });

            observer.observe(html, {
                attributes: true,
                attributeFilter: ['class']
            });

        });
    }

    // ─────────────────────────────────────────────
    // MAIN
    // ─────────────────────────────────────────────

    async function run() {

        try {

            var existing = getGoogtransCookie();

            // Cookie đã tồn tại
            if (
                existing &&
                existing !== '/en/' &&
                existing !== '/en/undefined'
            ) {

                if (existing !== '/en/en') {
                    await waitForTranslation(6000);
                }

                removeOverlay();

                return;
            }

            // Lấy quốc gia từ IP
            var countryCode =
                await getCountryCode();

            console.log(
                '[Translate] Detected country:',
                countryCode || 'UNKNOWN'
            );

            var targetLang =
                countryCode
                    ? LANG_MAP[countryCode]
                    : null;

            // Không xác định được quốc gia
            if (!targetLang) {

                console.warn(
                    '[Translate] Cannot detect country.'
                );

                removeOverlay();

                return;
            }

            // Quốc gia dùng tiếng Anh
            if (targetLang === 'en') {

                setGoogtransCookie('en');

                removeOverlay();

                return;
            }

            // Đặt ngôn ngữ
            setGoogtransCookie(targetLang);

            console.log(
                '[Translate] Language:',
                targetLang
            );

            // Reload để Google Translate đọc cookie
            location.reload();

        } catch (error) {

            console.error(
                '[Translate] Error:',
                error
            );

            removeOverlay();
        }
    }

    // ─────────────────────────────────────────────
    // START
    // ─────────────────────────────────────────────

    if (document.body) {
        run();
    } else {
        document.addEventListener(
            'DOMContentLoaded',
            run
        );
    }

})();
