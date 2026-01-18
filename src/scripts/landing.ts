type Theme = 'dark' | 'light';

const root = document.documentElement;

const getInitialTheme = (): Theme => {
	const stored = localStorage.getItem('theme');
	if (stored === 'dark' || stored === 'light') return stored;
	return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const setTheme = (theme: Theme) => {
	root.dataset.theme = theme;
	localStorage.setItem('theme', theme);
	const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
	toggle?.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
	toggle?.setAttribute('title', theme === 'light' ? 'Tema: Light' : 'Tema: Dark');
};

setTheme(getInitialTheme());

document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.addEventListener('click', () => {
	const current: Theme = root.dataset.theme === 'light' ? 'light' : 'dark';
	setTheme(current === 'light' ? 'dark' : 'light');
});

const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let initRevealElement: ((el: HTMLElement, force?: boolean) => void) | null = null;
if (prefersReducedMotion) {
	for (const el of revealEls) el.classList.add('is-in');
} else {
	const rand = (min: number, max: number) => min + Math.random() * (max - min);
	initRevealElement = (el: HTMLElement, force = false) => {
		if (el.dataset.revealInit === '1' && force === false) return;
		el.dataset.revealInit = '1';
		el.style.setProperty('--reveal-x', `${Math.round(rand(-22, 22))}px`);
		el.style.setProperty('--reveal-y', `${Math.round(rand(-10, 34))}px`);
		el.style.setProperty('--reveal-r', `${rand(-3, 3).toFixed(2)}deg`);
		el.style.setProperty('--reveal-s', `${rand(0.96, 1.02).toFixed(3)}`);
		el.style.setProperty('--reveal-blur', `${rand(10, 18).toFixed(1)}px`);
	};

	for (const el of revealEls) initRevealElement(el);

	const revealObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const el = entry.target as HTMLElement;
				const delay = Number(el.dataset.delay ?? '0');
				if (Number.isFinite(delay) && delay > 0) el.style.transitionDelay = `${delay}ms`;
				el.classList.add('is-in');
				revealObserver.unobserve(entry.target);
			}
		},
		{ threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
	);

	for (const el of revealEls) revealObserver.observe(el);
}

const projectsToggle = document.querySelector<HTMLButtonElement>('[data-projects-toggle]');
const projectExtras = Array.from(document.querySelectorAll<HTMLElement>('[data-project-extra]'));
let projectsExpanded = false;

const syncProjectsToggle = () => {
	if (!projectsToggle) return;
	projectsToggle.setAttribute('aria-expanded', projectsExpanded ? 'true' : 'false');
	const openLabel = projectsToggle.dataset.openLabel;
	const closeLabel = projectsToggle.dataset.closeLabel;
	projectsToggle.textContent = projectsExpanded ? closeLabel ?? 'Tutup Karya' : openLabel ?? 'Lihat Semua Karya';
};

const setProjectsExpanded = (expanded: boolean) => {
	projectsExpanded = expanded;
	for (const el of projectExtras) {
		if (expanded) {
			el.classList.remove('hidden');
			el.style.transitionDelay = '';
			if (prefersReducedMotion) {
				el.classList.add('is-in');
			} else {
				el.classList.remove('is-in');
				initRevealElement?.(el, true);
				requestAnimationFrame(() => el.classList.add('is-in'));
			}
		} else {
			el.classList.add('hidden');
			el.classList.remove('is-in');
			el.style.transitionDelay = '';
		}
	}
	syncProjectsToggle();
};

syncProjectsToggle();
projectsToggle?.addEventListener('click', () => setProjectsExpanded(!projectsExpanded));

const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-link[data-nav]'));
const sections = navLinks
	.map((a) => a.getAttribute('href'))
	.filter((href): href is string => !!href && href.startsWith('#'))
	.map((href) => document.querySelector<HTMLElement>(href))
	.filter((el): el is HTMLElement => !!el);

const setActive = (id: string) => {
	for (const link of navLinks) {
		const href = link.getAttribute('href');
		link.classList.toggle('is-active', href === `#${id}`);
	}
};

const header = document.querySelector<HTMLElement>('[data-header]');
const headerOffset = Math.round((header?.offsetHeight ?? 0) + 12);

let activeId = '';
const applyActive = (id: string) => {
	if (!id || id === activeId) return;
	activeId = id;
	setActive(id);
};

const setActiveFromHash = () => {
	const id = window.location.hash.replace('#', '');
	if (!id) return;
	applyActive(id);
};

const updateActiveFromViewport = () => {
	const probeY = headerOffset + Math.round((window.innerHeight - headerOffset) * 0.28);
	for (const section of sections) {
		const rect = section.getBoundingClientRect();
		if (rect.top <= probeY && rect.bottom > probeY) {
			applyActive(section.id);
			return;
		}
	}

	let bestId = '';
	let bestDist = Number.POSITIVE_INFINITY;
	for (const section of sections) {
		const rect = section.getBoundingClientRect();
		const dist = Math.abs(rect.top - headerOffset);
		if (dist < bestDist) {
			bestDist = dist;
			bestId = section.id;
		}
	}
	if (bestId) applyActive(bestId);
};

setActiveFromHash();
window.addEventListener('hashchange', setActiveFromHash);

for (const link of navLinks) {
	link.addEventListener('click', () => {
		const href = link.getAttribute('href');
		if (!href || href[0] !== '#') return;
		applyActive(href.slice(1));
	});
}

let spyRaf = 0;
const requestSpyUpdate = () => {
	cancelAnimationFrame(spyRaf);
	spyRaf = requestAnimationFrame(updateActiveFromViewport);
};

requestSpyUpdate();
window.addEventListener('scroll', requestSpyUpdate, { passive: true });
window.addEventListener('resize', requestSpyUpdate, { passive: true });

const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero && window.matchMedia('(prefers-reduced-motion: reduce)').matches === false) {
	let raf = 0;
	const onMove = (ev: PointerEvent) => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => {
			const rect = hero.getBoundingClientRect();
			const x = (ev.clientX - rect.left) / rect.width - 0.5;
			const y = (ev.clientY - rect.top) / rect.height - 0.5;
			hero.style.setProperty('--mx', `${x.toFixed(3)}`);
			hero.style.setProperty('--my', `${y.toFixed(3)}`);
		});
	};
	window.addEventListener('pointermove', onMove, { passive: true });

	const onScroll = () => {
		const rect = hero.getBoundingClientRect();
		const denom = window.innerHeight + rect.height;
		const raw = denom === 0 ? 0 : (window.innerHeight - rect.top) / denom;
		const progress = Math.min(1, Math.max(0, raw));
		hero.style.setProperty('--scroll', progress.toFixed(3));
	};
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
}

if (header) {
	const onHeaderScroll = () => {
		header.classList.toggle('is-scrolled', window.scrollY > 8);
	};
	onHeaderScroll();
	window.addEventListener('scroll', onHeaderScroll, { passive: true });
}
