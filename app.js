/* ═══════════════════════════════════════════════════════════════════
   GHEFSA · app.js
   Vanilla JS, sin dependencias (Lenis opcional para el scroll inercial).
   Un único bucle rAF reparte el trabajo entre:
     · tasks      → tareas ligadas al scroll (solo corren si hubo scroll)
     · frameTasks → tareas por frame (hero 3D, canvas, ticker, cursor)
   ───────────────────────────────────────────────────────────────────
   01 Utilidades · 02 Loader · 03 Scroll/Lenis · 04 Header & menú
   05 Texto & reveals · 06 Hero 3D + canvas · 07 Ticker · 08 Manifiesto
   09 Imagen expandible · 10 Tarjetas apiladas · 11 Flujo hidráulico
   12 Selector de escala · 13 Proceso · 14 Galería · 15 Bento
   16 FAQ · 17 Formulario → WhatsApp · 18 Cursor & magnéticos · 19 Extras
   ═══════════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ───────── 01 · UTILIDADES ───────── */
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = t => 1 - Math.pow(1 - t, 4);

    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const mqDesktop = matchMedia('(min-width: 900px)');
    const mqTablet = matchMedia('(min-width: 768px)');

    let vw = innerWidth;
    let vh = innerHeight;
    let maxScroll = 1;
    let lenis = null;
    let dirty = true;
    let vel = 0;                         // velocidad de scroll suavizada (px/frame)
    const tasks = [];                    // (scrollY) => void
    const frameTasks = [];               // (time, dt) => void
    const onResize = [];

    const measure = () => {
        vw = innerWidth;
        vh = innerHeight;
        maxScroll = Math.max(1, root.scrollHeight - vh);
        onResize.forEach(fn => fn());
        dirty = true;
    };
    addEventListener('resize', measure);
    addEventListener('load', measure);
    if ('ResizeObserver' in window) new ResizeObserver(() => { maxScroll = Math.max(1, root.scrollHeight - vh); dirty = true; }).observe(document.body);

    /* Número de WhatsApp: se define UNA vez en <body data-wa="…"> */
    const WA = document.body.dataset.wa || '520000000000';
    const waUrl = text => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    $$('[data-wa-msg]').forEach(a => { a.href = waUrl(a.dataset.waMsg); });

    /* Imágenes remotas que fallen: se oculta el icono roto y queda el fondo técnico */
    $$('img').forEach(img => {
        const bad = () => img.classList.add('is-broken');
        img.addEventListener('error', bad);
        if (img.complete && img.naturalWidth === 0 && img.currentSrc) bad();
    });

    /* ───────── BUCLE PRINCIPAL ───────── */
    let prevY = -1;
    let prevT = performance.now();
    const loop = t => {
        const dt = Math.min(64, t - prevT);
        prevT = t;
        if (lenis) lenis.raf(t);
        const y = scrollY;
        const dy = prevY < 0 ? 0 : y - prevY;
        vel = lerp(vel, dy, .12);
        if (dy !== 0 || dirty) {
            tasks.forEach(fn => fn(y));
            dirty = false;
        }
        prevY = y;
        frameTasks.forEach(fn => fn(t, dt));
        requestAnimationFrame(loop);
    };

    /* ───────── 02 · LOADER ───────── */
    function runLoader(onDone) {
        const el = $('#loader');
        if (!el) { root.classList.remove('is-loading'); root.classList.add('is-ready'); onDone(); return; }

        const pct = $('.ld-pct', el);
        const msg = $('.ld-msg', el);
        const msgs = ['Trazando cimientos', 'Calculando estructura', 'Tendiendo ductos', 'Soldando nodos', 'Todo listo para construir'];
        const MIN = reduced ? 350 : 2900;
        const t0 = performance.now();
        let loaded = false;
        let p = 0;
        let msgIdx = -1;

        Promise.all([
            document.readyState === 'complete' ? 1 : new Promise(r => addEventListener('load', r, { once: true })),
            document.fonts && document.fonts.ready ? document.fonts.ready : 1
        ]).then(() => { loaded = true; });
        setTimeout(() => { loaded = true; }, 6500);          // red lenta: no bloqueamos la página

        const finish = () => {
            el.classList.add('is-done');
            root.classList.remove('is-loading');
            root.classList.add('is-ready');
            onDone();
            setTimeout(() => el.classList.add('is-gone'), 1600);
        };

        const step = now => {
            const elapsed = now - t0;
            const target = loaded ? Math.min(1, elapsed / MIN) : Math.min(.88, (elapsed / MIN) * .88);
            p += (target - p) * .085;
            const shown = p > .995 && target >= 1 ? 1 : p;
            el.style.setProperty('--p', shown.toFixed(4));
            pct.textContent = String(Math.round(shown * 100)).padStart(3, '0');
            const idx = Math.min(msgs.length - 1, Math.floor(shown * msgs.length));
            if (idx !== msgIdx) { msgIdx = idx; msg.textContent = msgs[idx]; }
            if (shown >= 1) { setTimeout(finish, 280); return; }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* ───────── 03 · SCROLL SUAVE (Lenis) + ANCLAS ───────── */
    function initScroll() {
        if (!reduced && window.Lenis) {
            lenis = new Lenis({
                duration: 1.25,
                easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: .9
            });
        }
    }

    function scrollToEl(target) {
        const offset = target.id === 'inicio' ? 0 : -76;
        if (lenis) lenis.scrollTo(target, { offset, duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
        else scrollTo({ top: target.getBoundingClientRect().top + scrollY + offset, behavior: reduced ? 'auto' : 'smooth' });
    }

    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        scrollToEl(target);
        history.replaceState(null, '', id);
    });

    /* ───────── 04 · HEADER, PROGRESO Y MENÚ MÓVIL ───────── */
    const menuBtn = $('#menuBtn');
    const menu = $('#menu');
    function setMenu(open) {
        root.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        menu.setAttribute('aria-hidden', String(!open));
        if (lenis) open ? lenis.stop() : lenis.start();
    }
    function closeMenu() { if (root.classList.contains('menu-open')) setMenu(false); }

    function initHeader() {
        const header = $('#header');
        const bar = $('.scroll-progress span');
        let lastY = 0;

        menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
        addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
        mqDesktop.addEventListener('change', closeMenu);

        tasks.push(y => {
            bar.style.transform = `scaleX(${clamp(y / maxScroll).toFixed(4)})`;
            header.classList.toggle('is-scrolled', y > 24);
            if (Math.abs(y - lastY) > 6) {
                const down = y > lastY;
                header.classList.toggle('is-hidden', down && y > 260 && !root.classList.contains('menu-open'));
                lastY = y;
            }
        });

        /* Enlace activo según la sección visible */
        const links = $$('.nav a, .menu-nav a');
        const map = new Map();
        links.forEach(a => { const id = a.getAttribute('href'); if (id && id.length > 1) map.set(id.slice(1), (map.get(id.slice(1)) || []).concat(a)); });
        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                links.forEach(l => l.classList.remove('is-current'));
                (map.get(en.target.id) || []).forEach(l => l.classList.add('is-current'));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }

    /* ───────── 05 · TEXTO: SPLIT POR PALABRAS, REVEALS, CONTADORES ───────── */
    function wrapWords(el, wrapClass, innerClass) {
        const words = [];
        const walk = node => {
            Array.from(node.childNodes).forEach(n => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(tok => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const outer = document.createElement('span');
                        outer.className = wrapClass;
                        if (innerClass) {
                            const inner = document.createElement('span');
                            inner.className = innerClass;
                            inner.textContent = tok;
                            inner.style.setProperty('--i', words.length);
                            outer.appendChild(inner);
                        } else {
                            outer.textContent = tok;
                        }
                        words.push(outer);
                        frag.appendChild(outer);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1 && n.tagName !== 'BR') {
                    walk(n);
                }
            });
        };
        walk(el);
        return words;
    }

    function initText() {
        $$('[data-split]').forEach(el => wrapWords(el, 'w', 'wi'));

        /* Retraso escalonado entre hermanos con data-reveal */
        $$('[data-reveal]').forEach(el => {
            const sibs = Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal'));
            if (sibs.length > 1) el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 0.08}s`);
        });

        const io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                en.target.classList.add('is-in');
                io.unobserve(en.target);
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        $$('[data-reveal], [data-split]').forEach(el => io.observe(el));

        /* Contadores */
        const cio = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                cio.unobserve(en.target);
                const el = en.target;
                const end = parseFloat(el.dataset.count);
                const pad = parseInt(el.dataset.pad || '0', 10);
                const fmt = n => String(Math.round(n)).padStart(pad, '0');
                if (reduced) { el.textContent = fmt(end); return; }
                const t0 = performance.now();
                const dur = 1700;
                const tick = now => {
                    const k = clamp((now - t0) / dur);
                    el.textContent = fmt(end * easeOut(k));
                    if (k < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        }, { threshold: .6 });
        $$('[data-count]').forEach(el => { el.textContent = String(0).padStart(parseInt(el.dataset.pad || '0', 10), '0'); cio.observe(el); });
    }

    /* ───────── 06 · HERO: MONOGRAMA 3D EXTRUIDO + RED ESTRUCTURAL ───────── */
    function initHero() {
        const hero = $('#inicio');
        const scene = $('#markScene');
        const plane = $('#markPlane');
        const layers = $('#markLayers');
        const face = $('.mark-face', layers);
        const shadow = $('#markShadow');
        if (!hero || !plane) return;

        /* Extrusión: N copias de la G apiladas en Z, de gris oscuro (atrás) a acero claro (frente). El wordmark HEFSA solo va en la cara frontal */
        const NS = 'http://www.w3.org/2000/svg';
        const N = mqDesktop.matches ? 30 : 20;
        const stack = [];
        for (let i = 0; i < N; i++) {
            const k = i / (N - 1);
            const c = Math.round(lerp(34, 96, Math.pow(k, 1.6)));
            const tone = `rgb(${c},${c - 1},${c - 5})`;
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 1515 900');
            svg.setAttribute('class', 'mk-layer');
            svg.setAttribute('aria-hidden', 'true');
            const use = document.createElementNS(NS, 'use');
            use.setAttribute('href', '#g-body');
            use.setAttribute('fill', tone);
            use.setAttribute('stroke', tone);
            svg.appendChild(use);
            layers.insertBefore(svg, face);
            stack.push(svg);
        }
        let depth = 0;
        const layout = () => {
            depth = scene.offsetWidth * .085;
            stack.forEach((s, i) => { s.style.transform = `translateZ(${(lerp(-depth / 2, depth / 2, i / (N - 1))).toFixed(2)}px)`; });
            face.style.transform = `translateZ(${(depth / 2 + .6).toFixed(2)}px)`;
        };
        layout();
        onResize.push(layout);

        /* Puntero + visibilidad */
        const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
        addEventListener('pointermove', e => { ptr.tx = (e.clientX / vw) * 2 - 1; ptr.ty = (e.clientY / vh) * 2 - 1; }, { passive: true });
        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

        const huds = $$('.hud');
        let introStart = null;
        const frame = (t) => {
            if (!visible && !reduced) return;
            if (introStart === null && root.classList.contains('is-ready')) introStart = t;
            const intro = reduced ? 1 : introStart === null ? 0 : clamp((t - introStart - 350) / 2000);
            ptr.x = lerp(ptr.x, ptr.tx, .06);
            ptr.y = lerp(ptr.y, ptr.ty, .06);
            const sc = clamp(scrollY / Math.max(1, hero.offsetHeight));
            const sway = reduced ? 0 : 1;
            const ry = -26 + ptr.x * 17 + Math.sin(t * .00052) * 8 * sway + sc * 55 + (1 - easeOut(intro)) * -120;
            const rx = 13 - ptr.y * 10 + Math.sin(t * .00071 + 1) * 3 * sway - sc * 12;
            const s = lerp(.7, 1, easeOut(intro)) * (1 - sc * .14);
            plane.style.transform = `translate3d(0,${(-sc * 46).toFixed(1)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`;
            shadow.style.transform = `translateX(calc(-50% + ${(-ry * 1.4).toFixed(1)}px)) scale(${(1 - sc * .3).toFixed(3)})`;
            huds.forEach((h, i) => { const d = (i % 2 ? -1 : 1) * (10 + i * 5); h.style.translate = `${(ptr.x * d).toFixed(1)}px ${(ptr.y * d * .7).toFixed(1)}px`; });
        };
        frameTasks.push(frame);
        if (reduced) frame(0);

        /* Contenido del hero se desvanece suavemente al salir */
        const copy = $('.hero-copy');
        tasks.push(y => {
            if (y > vh * 1.2) return;
            const k = clamp(y / (vh * .9));
            copy.style.transform = `translate3d(0,${(k * -50).toFixed(1)}px,0)`;
            copy.style.opacity = (1 - k * .9).toFixed(3);
        });

        initNetwork(hero, ptr);
    }

    /* Red de nodos y vigas: malla estructural viva con pulsos naranjas que recorren las conexiones */
    function initNetwork(hero) {
        const cv = $('#heroCanvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        let w = 0, h = 0, nodes = [], pulses = [], visible = true, lastPulse = 0;
        const mouse = { x: -999, y: -999 };

        const build = () => {
            const n = clamp(Math.round((w * h) / 21000), 16, 68);
            nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22 }));
            pulses = [];
        };
        const resize = () => {
            const r = cv.getBoundingClientRect();
            const dpr = Math.min(devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            build();
        };
        resize();
        onResize.push(resize);

        addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

        const draw = (t, dt) => {
            ctx.clearRect(0, 0, w, h);
            const L = clamp(w * .16, 110, 190);
            const edges = [];
            for (const n of nodes) {
                n.x += n.vx * dt * .06; n.y += n.vy * dt * .06;
                if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
                if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
            }
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < L) {
                        edges.push([i, j]);
                        ctx.strokeStyle = `rgba(34,33,30,${((1 - d / L) * .2).toFixed(3)})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
                if (dm < 170) {
                    ctx.strokeStyle = `rgba(255,90,31,${((1 - dm / 170) * .55).toFixed(3)})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
                ctx.fillStyle = 'rgba(34,33,30,.38)';
                ctx.fillRect(a.x - 1.6, a.y - 1.6, 3.2, 3.2);
            }
            /* Pulsos */
            if (!reduced && t - lastPulse > 650 && edges.length && pulses.length < 7) {
                const e = edges[(Math.random() * edges.length) | 0];
                pulses.push({ a: e[0], b: e[1], k: 0 });
                lastPulse = t;
            }
            for (let i = pulses.length - 1; i >= 0; i--) {
                const p = pulses[i];
                p.k += dt / 1000;
                if (p.k >= 1) { pulses.splice(i, 1); continue; }
                const a = nodes[p.a], b = nodes[p.b];
                const x = lerp(a.x, b.x, p.k), y = lerp(a.y, b.y, p.k);
                const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
                g.addColorStop(0, 'rgba(255,90,31,.55)'); g.addColorStop(1, 'rgba(255,90,31,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill();
                ctx.fillStyle = '#FF5A1F'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.283); ctx.fill();
            }
        };
        if (reduced) { draw(0, 0); return; }
        frameTasks.push((t, dt) => { if (visible) draw(t, dt); });
    }

    /* ───────── 07 · TICKER REACTIVO AL SCROLL ───────── */
    function initTicker() {
        const rows = $$('.ticker-row');
        if (!rows.length) return;
        const items = rows.map(row => {
            const track = $('.ticker-track', row);
            const group = $('.ticker-group', track);
            return { row, track, group, dir: parseFloat(row.dataset.dir) || -1, x: 0, k: 1, w: 1 };
        });
        const fill = () => {
            items.forEach(it => {
                $$('.ticker-group', it.track).slice(1).forEach(g => g.remove());
                let guard = 0;
                while (it.track.scrollWidth < vw * 2 + it.group.offsetWidth && guard++ < 6) {
                    const c = it.group.cloneNode(true);
                    c.setAttribute('aria-hidden', 'true');
                    it.track.appendChild(c);
                }
                it.w = it.group.offsetWidth || 1;
            });
        };
        fill();
        onResize.push(fill);
        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe($('.ticker'));

        frameTasks.push((t, dt) => {
            if (!visible || reduced) return;
            items.forEach(it => {
                it.k = lerp(it.k, vel < -.6 ? -1 : 1, .06);
                const speed = 55 + Math.min(Math.abs(vel), 40) * 55;
                it.x += it.dir * it.k * speed * (dt / 1000);
                it.x = ((it.x % it.w) + it.w) % it.w - it.w;
                it.track.style.transform = `translate3d(${it.x.toFixed(1)}px,0,0)`;
            });
        });
    }

    /* ───────── 08 · MANIFIESTO: PALABRAS QUE SE ENCIENDEN CON EL SCROLL ───────── */
    function initManifesto() {
        const el = $('[data-scrub]');
        if (!el) return;
        const words = wrapWords(el, 'sw');
        const n = words.length;
        const last = new Array(n).fill(-1);
        const render = p => {
            const k = p * (n + 6);
            words.forEach((w, i) => {
                const o = .13 + .87 * clamp(k - i);
                if (Math.abs(o - last[i]) > .015) { w.style.opacity = o.toFixed(2); last[i] = o; }
            });
        };
        if (reduced) { render(1); return; }
        tasks.push(() => {
            const r = el.getBoundingClientRect();
            if (r.bottom < -100 || r.top > vh + 100) return;
            render(clamp((vh * .86 - r.top) / (r.height + vh * .38)));
        });
    }

    /* ───────── 09 · IMAGEN QUE SE ABRE EN GRANDE ───────── */
    function initExpand() {
        const sec = $('.expand');
        if (!sec) return;
        tasks.push(() => {
            const r = sec.getBoundingClientRect();
            if (r.bottom < -50 || r.top > vh + 50) return;
            const p = clamp(-r.top / Math.max(1, r.height - vh));
            const e = easeInOut(clamp(p / .58));
            const c = clamp((p - .64) / .22);
            sec.style.setProperty('--e', e.toFixed(4));
            sec.style.setProperty('--c', c.toFixed(4));
            sec.classList.toggle('is-live', c > .15);
        });
    }

    /* ───────── 10 · TARJETAS APILADAS ───────── */
    function initStack() {
        const cards = $$('.svc');
        if (!cards.length) return;
        let tops = [];
        const calc = () => { tops = cards.map(c => parseFloat(getComputedStyle(c).top) || 0); };
        calc();
        onResize.push(calc);
        tasks.push(() => {
            if (!mqDesktop.matches) { cards.forEach(c => c.style.removeProperty('--k')); return; }
            for (let i = 0; i < cards.length - 1; i++) {
                const dist = cards[i + 1].getBoundingClientRect().top - tops[i + 1];
                cards[i].style.setProperty('--k', clamp(1 - dist / (vh * .78)).toFixed(3));
            }
        });
    }

    /* ───────── 11 · INFRAESTRUCTURA QUE FLUYE ───────── */
    function initFlow() {
        const track = $('#flowTrack');
        if (!track) return;
        const nodes = $$('.flow-node', track);
        tasks.push(() => {
            const r = track.getBoundingClientRect();
            if (r.bottom < -60 || r.top > vh + 60) return;
            const p = clamp((vh * .6 - r.top) / r.height);
            track.style.setProperty('--flow', p.toFixed(4));
            nodes.forEach(n => {
                const c = (n.getBoundingClientRect().top + 46 - r.top) / r.height;
                n.classList.toggle('is-on', p >= c);
            });
        });
    }

    /* ───────── 12 · SELECTOR DE ESCALA ───────── */
    function initScale() {
        const sec = $('#escala');
        const tabs = $$('.scale-tab');
        const panels = $$('.scale-panel');
        if (!sec || !tabs.length) return;

        panels.forEach(p => $$('.draw', p).forEach((el, i) => { el.setAttribute('pathLength', '1'); el.style.setProperty('--n', i); }));
        let cur = 0;

        const go = (i, manual = false) => {
            cur = (i + tabs.length) % tabs.length;
            tabs.forEach((t, k) => {
                const on = k === cur;
                t.classList.toggle('is-active', on);
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                panels[k].classList.toggle('is-active', on);
                panels[k].setAttribute('aria-hidden', String(!on));
            });
            if (manual) sec.classList.add('is-manual');
        };

        tabs.forEach((t, i) => {
            t.addEventListener('click', () => go(i, true));
            t.addEventListener('keydown', e => {
                const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                if (k) { e.preventDefault(); go(cur + k, true); tabs[cur].focus(); }
                else if (e.key === 'Home') { e.preventDefault(); go(0, true); tabs[0].focus(); }
                else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1, true); tabs[cur].focus(); }
            });
            /* El autoavance lo gobierna la animación de la barra: al terminar, pasa a la siguiente */
            if (!reduced) $('.tab-bar', t).addEventListener('animationend', e => { if (e.animationName === 'tabfill') go(cur + 1); });
        });

        /* Pausa si no está a la vista o si el usuario interactúa */
        new IntersectionObserver(([e]) => sec.classList.toggle('is-paused', !e.isIntersecting), { threshold: .3 }).observe(sec);
        const ui = $('.scale-ui');
        ui.addEventListener('pointerenter', () => sec.classList.add('is-paused'));
        ui.addEventListener('pointerleave', () => sec.classList.remove('is-paused'));
    }

    /* ───────── 13 · PROCESO ───────── */
    function initProcess() {
        const list = $('#steps');
        if (!list) return;
        const steps = $$('.step', list);
        const num = $('#procNum');
        let shown = -1;
        tasks.push(() => {
            const r = list.getBoundingClientRect();
            if (r.bottom < -60 || r.top > vh + 60) return;
            const mid = vh * .5;
            let active = 0, best = Infinity;
            steps.forEach((s, i) => {
                const sr = s.getBoundingClientRect();
                const d = Math.abs(sr.top + sr.height / 2 - mid);
                if (d < best) { best = d; active = i; }
            });
            const on = r.top < vh * .78;
            steps.forEach((s, i) => s.classList.toggle('is-active', on && i === active));
            if (active !== shown) { shown = active; num.textContent = String(active + 1).padStart(2, '0'); }
            list.style.setProperty('--prog', clamp((mid - r.top) / r.height).toFixed(4));
        });
    }

    /* ───────── 14 · GALERÍA PARALLAX · BANDA · FOOTER ───────── */
    function initParallax() {
        const wrap = $('#mosaic');
        const cols = $$('.mosaic-col', wrap || document);
        const band = $('.band');
        const bandMark = $('.band-mark');
        const giant = $('.footer-giant');

        tasks.push(() => {
            if (wrap) {
                if (!mqTablet.matches || reduced) { cols.forEach(c => { c.style.transform = ''; }); }
                else {
                    const r = wrap.getBoundingClientRect();
                    if (r.bottom > -240 && r.top < vh + 240) {
                        const off = r.top + r.height / 2 - vh / 2;
                        cols.forEach(c => { c.style.transform = `translate3d(0,${(off * (parseFloat(c.dataset.speed) || 0)).toFixed(1)}px,0)`; });
                    }
                }
            }
            if (band && bandMark && !reduced) {
                const r = band.getBoundingClientRect();
                if (r.bottom > 0 && r.top < vh) {
                    const k = (r.top + r.height / 2 - vh / 2) / vh;
                    bandMark.style.transform = `rotate(${(k * -14).toFixed(2)}deg) scale(${(1 + k * .06).toFixed(3)})`;
                }
            }
            if (giant && !reduced) {
                const r = giant.getBoundingClientRect();
                if (r.top < vh + 200) giant.style.setProperty('--fy', (clamp((r.top - vh * .55) / (vh * .45)) * 70).toFixed(1));
            }
        });
    }

    /* ───────── 15 · BENTO: LUZ QUE SIGUE AL PUNTERO + INCLINACIÓN 3D ───────── */
    function initTilt() {
        if (!finePointer) return;
        $$('.bcard').forEach(card => {
            const tilt = card.hasAttribute('data-tilt');
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width;
                const y = (e.clientY - r.top) / r.height;
                card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
                card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
                if (tilt) {
                    card.style.setProperty('--ry', `${((x - .5) * 7).toFixed(2)}deg`);
                    card.style.setProperty('--rx', `${((.5 - y) * 7).toFixed(2)}deg`);
                }
            });
            card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
        });
    }

    /* ───────── 16 · FAQ ───────── */
    function initFaq() {
        const items = $$('.acc-item');
        const setOpen = (it, open) => {
            it.classList.toggle('is-open', open);
            $('.acc-btn', it).setAttribute('aria-expanded', String(open));
        };
        items.forEach(it => $('.acc-btn', it).addEventListener('click', () => {
            const willOpen = !it.classList.contains('is-open');
            items.forEach(o => setOpen(o, false));
            setOpen(it, willOpen);
        }));
        if (items[0]) setOpen(items[0], true);
    }

    /* ───────── 17 · FORMULARIO → WHATSAPP ───────── */
    function initForm() {
        const form = $('#contactForm');
        if (!form) return;
        const ok = $('#formOk');
        const okLink = $('#formOkLink');

        const rules = {
            nombre: v => (v.trim().length >= 2 ? '' : 'Escribe tu nombre para poder responderte.'),
            telefono: v => { const d = v.replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 ? '' : 'Ingresa un teléfono válido (mínimo 8 dígitos).'; }
        };
        const setErr = (input, msg) => {
            const f = input.closest('.field');
            f.classList.toggle('has-error', !!msg);
            $('.err', f).textContent = msg;
            input.setAttribute('aria-invalid', String(!!msg));
        };
        Object.keys(rules).forEach(name => {
            const input = form.elements[name];
            input.addEventListener('blur', () => setErr(input, rules[name](input.value)));
            input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) setErr(input, rules[name](input.value)); });
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            let valid = true;
            Object.keys(rules).forEach(name => {
                const input = form.elements[name];
                const msg = rules[name](input.value);
                setErr(input, msg);
                if (msg && valid) { valid = false; input.focus(); }
            });
            if (!valid) return;

            const d = new FormData(form);
            const lines = [
                `Hola GHEFSA, soy ${String(d.get('nombre')).trim()}.`,
                `Quiero cotizar: ${d.get('tipo')}.`,
                String(d.get('ubicacion')).trim() && `Ubicación de la obra: ${String(d.get('ubicacion')).trim()}.`,
                String(d.get('mensaje')).trim() && `Detalles: ${String(d.get('mensaje')).trim()}`,
                `Mi teléfono: ${String(d.get('telefono')).trim()}`
            ].filter(Boolean);
            const url = waUrl(lines.join('\n'));
            okLink.href = url;
            ok.hidden = false;
            window.open(url, '_blank', 'noopener');
        });
    }

    /* ───────── 18 · BOTONES MAGNÉTICOS Y CURSOR ───────── */
    function initPointerFx() {
        if (!finePointer) return;

        if (!reduced) {
            $$('[data-magnetic]').forEach(el => {
                el.addEventListener('pointermove', e => {
                    const r = el.getBoundingClientRect();
                    const x = e.clientX - (r.left + r.width / 2);
                    const y = e.clientY - (r.top + r.height / 2);
                    el.style.transform = `translate3d(${(x * .22).toFixed(1)}px,${(y * .3).toFixed(1)}px,0)`;
                });
                el.addEventListener('pointerleave', () => { el.style.transform = ''; });
            });
        }

        const cursor = $('.cursor');
        const dot = $('.cursor-dot');
        const ring = $('.cursor-ring');
        let x = -100, y = -100, rx = -100, ry = -100;
        cursor.classList.add('is-hidden');
        addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cursor.classList.remove('is-hidden'); }, { passive: true });
        root.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
        document.addEventListener('pointerover', e => {
            cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-magnetic], .scale-tab, .acc-btn, .chipr, input, textarea, label'));
        });
        frameTasks.push(() => {
            rx = lerp(rx, x, .17); ry = lerp(ry, y, .17);
            dot.style.transform = `translate3d(${x}px,${y}px,0)`;
            ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
        });
    }

    /* ───────── 19 · EXTRAS: WhatsApp flotante, año ───────── */
    function initExtras() {
        const y = $('#year');
        if (y) y.textContent = new Date().getFullYear();

        const wa = $('.wa-float');
        if (wa) {
            setTimeout(() => wa.classList.add('is-tip'), 6500);
            setTimeout(() => wa.classList.remove('is-tip'), 14500);
            wa.addEventListener('pointerenter', () => wa.classList.add('is-tip'));
            wa.addEventListener('pointerleave', () => wa.classList.remove('is-tip'));
        }
    }

    /* ───────── ARRANQUE ───────── */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);

    initHeader();
    initText();
    initHero();
    initTicker();
    initManifesto();
    initExpand();
    initStack();
    initFlow();
    initScale();
    initProcess();
    initParallax();
    initTilt();
    initFaq();
    initForm();
    initPointerFx();
    initExtras();
    measure();
    requestAnimationFrame(loop);

    runLoader(() => {
        initScroll();
        measure();
        const hash = location.hash && $(location.hash);
        if (hash) setTimeout(() => scrollToEl(hash), 900);
    });
})();
