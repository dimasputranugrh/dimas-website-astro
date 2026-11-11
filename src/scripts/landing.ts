type Theme = 'light' | 'dark';

type ViewTransitionDocument = Document & {
	startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

const isReduced = () => reducedMotion.matches;
const isFine = () => finePointer.matches;

const setInert = (element: HTMLElement, inert: boolean) => {
	if (inert) element.setAttribute('inert', '');
	else element.removeAttribute('inert');
};

const metaTheme = document.querySelector<HTMLMetaElement>('[data-theme-color]');

const syncTheme = () => {
	const theme: Theme = root.dataset.theme === 'dark' ? 'dark' : 'light';
	const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
	toggle?.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
	toggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
	toggle?.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
	if (metaTheme) metaTheme.content = theme === 'dark' ? '#14110F' : '#F2EDE4';
};

const applyTheme = (theme: Theme) => {
	root.dataset.theme = theme;
	try {
		localStorage.setItem('theme', theme);
	} catch {
		// Storage can be unavailable in private mode. The theme still applies for this page view.
	}
	syncTheme();
};

syncTheme();

document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.addEventListener('click', (event) => {
	const next: Theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
	const viewDocument = document as ViewTransitionDocument;

	if (!viewDocument.startViewTransition || isReduced()) {
		applyTheme(next);
		return;
	}

	const x = event.clientX || window.innerWidth / 2;
	const y = event.clientY || 72;
	const transition = viewDocument.startViewTransition(() => applyTheme(next));

	transition.ready
		.then(() => {
			const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
			root.animate(
				{
					clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
				},
				{
					duration: 620,
					easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
					pseudoElement: '::view-transition-new(root)',
				}
			);
		})
		.catch(() => {
			// The theme has already changed. The transition is a progressive enhancement.
		});
});

const revealSelector = '[data-reveal]';
const revealOwners = new Map<Element, HTMLElement[]>();
const revealObserver = new IntersectionObserver(
	(entries) => {
		for (const entry of entries) {
			if (!entry.isIntersecting) continue;
			const owners = revealOwners.get(entry.target);
			if (!owners) continue;
			for (const element of owners) element.classList.add('is-in');
			revealObserver.unobserve(entry.target);
		}
	},
	{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
);

const observeReveals = (scope: ParentNode = document) => {
	scope.querySelectorAll<HTMLElement>(revealSelector).forEach((element) => {
		if (isReduced()) {
			element.classList.add('is-in');
			return;
		}
		// A clipped element has an empty intersection rect, so mask reveals are
		// tracked through their parent and revealed by proxy.
		const target = element.dataset.reveal === 'mask' && element.parentElement ? element.parentElement : element;
		const owners = revealOwners.get(target) ?? [];
		owners.push(element);
		revealOwners.set(target, owners);
		revealObserver.observe(target);
	});
};

if (isReduced()) {
	document.querySelectorAll<HTMLElement>(revealSelector).forEach((element) => element.classList.add('is-in'));
} else {
	observeReveals();
}

reducedMotion.addEventListener('change', () => {
	if (!isReduced()) return;
	document.querySelectorAll<HTMLElement>(revealSelector).forEach((element) => element.classList.add('is-in'));
});

requestAnimationFrame(() => {
	requestAnimationFrame(() => root.classList.add('is-ready'));
});
window.setTimeout(() => root.classList.add('is-ready'), 900);

const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'));
const sections = navLinks
	.map((link) => link.getAttribute('href'))
	.filter((href): href is string => Boolean(href && href.startsWith('#')))
	.map((href) => document.querySelector<HTMLElement>(href))
	.filter((section): section is HTMLElement => Boolean(section));

const setActiveNav = (id: string) => {
	for (const link of navLinks) {
		if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'location');
		else link.removeAttribute('aria-current');
	}
};

const updateActiveFromViewport = () => {
	const probe = window.innerHeight * 0.32;
	let current = '';

	for (const section of sections) {
		const rect = section.getBoundingClientRect();
		if (rect.top <= probe && rect.bottom > probe) {
			current = section.id;
			break;
		}
	}

	if (!current) {
		let nearest = Number.POSITIVE_INFINITY;
		for (const section of sections) {
			const distance = Math.abs(section.getBoundingClientRect().top - probe);
			if (distance < nearest) {
				nearest = distance;
				current = section.id;
			}
		}
	}

	if (current) setActiveNav(current);
};

const header = document.querySelector<HTMLElement>('[data-header]');
const progress = document.querySelector<HTMLElement>('[data-progress]');
let scrollFrame = 0;

const onScrollFrame = () => {
	scrollFrame = 0;
	const max = document.documentElement.scrollHeight - window.innerHeight;
	const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
	if (progress) progress.style.transform = `scaleX(${ratio})`;
	header?.classList.toggle('is-scrolled', window.scrollY > 8);
	updateActiveFromViewport();
};

const requestScrollFrame = () => {
	if (scrollFrame) return;
	scrollFrame = requestAnimationFrame(onScrollFrame);
};

window.addEventListener('scroll', requestScrollFrame, { passive: true });
window.addEventListener('resize', requestScrollFrame, { passive: true });
window.addEventListener('hashchange', () => {
	const id = window.location.hash.slice(1);
	if (id) setActiveNav(id);
	requestScrollFrame();
});
requestScrollFrame();

const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menuPanel = document.querySelector<HTMLElement>('[data-menu-panel]');
const menuClose = document.querySelector<HTMLButtonElement>('[data-menu-close]');
const menuLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-menu-link]'));
const desktopNav = window.matchMedia('(min-width: 1024px)');
const focusableSelector =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
let menuOpen = false;

const openMenu = () => {
	if (!menuPanel || menuOpen) return;
	menuOpen = true;
	root.classList.add('is-menu-open');
	setInert(menuPanel, false);
	menuPanel.setAttribute('aria-hidden', 'false');
	menuToggle?.setAttribute('aria-expanded', 'true');
	document.body.style.overflow = 'hidden';
	const focusClose = () => {
		if (!menuOpen || menuPanel.contains(document.activeElement)) return;
		menuClose?.focus();
	};
	requestAnimationFrame(focusClose);
	window.setTimeout(focusClose, 340);
};

const closeMenu = (restoreFocus = true) => {
	if (!menuPanel || !menuOpen) return;
	menuOpen = false;
	root.classList.remove('is-menu-open');
	setInert(menuPanel, true);
	menuPanel.setAttribute('aria-hidden', 'true');
	menuToggle?.setAttribute('aria-expanded', 'false');
	document.body.style.overflow = '';
	if (restoreFocus) menuToggle?.focus();
};

menuToggle?.addEventListener('click', () => {
	if (menuOpen) closeMenu();
	else openMenu();
});
menuClose?.addEventListener('click', () => closeMenu());
menuLinks.forEach((link) => link.addEventListener('click', () => closeMenu(false)));

document.addEventListener('keydown', (event) => {
	if (!menuOpen) return;

	if (event.key === 'Escape') {
		event.preventDefault();
		closeMenu();
		return;
	}

	if (event.key !== 'Tab' || !menuPanel) return;

	const focusable = Array.from(menuPanel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
		(element) => element.offsetParent !== null
	);
	if (!focusable.length) return;

	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
});

desktopNav.addEventListener('change', (event) => {
	if (event.matches) closeMenu(false);
});

const ticker = document.querySelector<HTMLElement>('[data-ticker]');
const tickerToggle = document.querySelector<HTMLButtonElement>('[data-ticker-toggle]');
let tickerPaused = false;

const syncTicker = () => {
	if (!ticker || !tickerToggle) return;
	ticker.dataset.paused = tickerPaused ? 'true' : 'false';
	tickerToggle.textContent = tickerPaused ? 'Play' : 'Pause';
	tickerToggle.setAttribute('aria-pressed', tickerPaused ? 'true' : 'false');
	tickerToggle.setAttribute('aria-label', tickerPaused ? 'Play the scrolling text' : 'Pause the scrolling text');
};

syncTicker();
tickerToggle?.addEventListener('click', () => {
	tickerPaused = !tickerPaused;
	syncTicker();
});

const tilt = document.querySelector<HTMLElement>('[data-tilt]');
if (tilt && isFine() && !isReduced()) {
	let tiltFrame = 0;
	const onTiltMove = (event: PointerEvent) => {
		cancelAnimationFrame(tiltFrame);
		tiltFrame = requestAnimationFrame(() => {
			const rect = tilt.getBoundingClientRect();
			const x = (event.clientX - rect.left) / rect.width - 0.5;
			const y = (event.clientY - rect.top) / rect.height - 0.5;
			tilt.style.setProperty('--rx', `${(-y * 3).toFixed(2)}deg`);
			tilt.style.setProperty('--ry', `${(x * 3).toFixed(2)}deg`);
		});
	};
	const resetTilt = () => {
		tilt.style.setProperty('--rx', '0deg');
		tilt.style.setProperty('--ry', '0deg');
	};
	tilt.addEventListener('pointermove', onTiltMove);
	tilt.addEventListener('pointerleave', resetTilt);
}

if (isFine() && !isReduced()) {
	document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((element) => {
		let magneticFrame = 0;
		const onMagneticMove = (event: PointerEvent) => {
			cancelAnimationFrame(magneticFrame);
			magneticFrame = requestAnimationFrame(() => {
				const rect = element.getBoundingClientRect();
				const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
				const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
				element.style.setProperty('--mx', `${(x * 4).toFixed(1)}px`);
				element.style.setProperty('--my', `${(y * 3).toFixed(1)}px`);
			});
		};
		const resetMagnetic = () => {
			element.style.setProperty('--mx', '0px');
			element.style.setProperty('--my', '0px');
		};
		element.addEventListener('pointermove', onMagneticMove);
		element.addEventListener('pointerleave', resetMagnetic);
		element.addEventListener('blur', resetMagnetic);
	});
}

const projectRows = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-project]'));
const previewImg = document.querySelector<HTMLImageElement>('[data-preview-img]');
const previewTitle = document.querySelector<HTMLElement>('[data-preview-title]');
const previewTag = document.querySelector<HTMLElement>('[data-preview-tag]');
const previewIndex = document.querySelector<HTMLElement>('[data-preview-index]');

if (previewImg) previewImg.dataset.current = previewImg.getAttribute('src') ?? '';

const setPreview = (row: HTMLElement) => {
	if (!previewImg) return;
	const src = row.dataset.img;
	if (!src || previewImg.dataset.current === src) return;

	previewImg.dataset.current = src;
	previewImg.src = src;
	previewImg.alt = `Interface preview of ${row.dataset.title ?? ''}`;
	if (previewTitle) previewTitle.textContent = row.dataset.title ?? '';
	if (previewTag) previewTag.textContent = row.dataset.tag ?? '';
	if (previewIndex) previewIndex.textContent = row.dataset.index ?? '';

	previewImg.classList.remove('is-in');
	void previewImg.offsetWidth;
	previewImg.classList.add('is-in');
};

for (const row of projectRows) {
	row.addEventListener('pointerenter', () => setPreview(row));
	row.addEventListener('focus', () => setPreview(row));
}

const dialog = document.querySelector<HTMLDialogElement>('[data-project-dialog]');
const dialogImg = document.querySelector<HTMLImageElement>('[data-dialog-img]');
const dialogTitle = document.querySelector<HTMLElement>('[data-dialog-title]');
const dialogTag = document.querySelector<HTMLElement>('[data-dialog-tag]');
const dialogStack = document.querySelector<HTMLElement>('[data-dialog-stack]');
const dialogIndex = document.querySelector<HTMLElement>('[data-dialog-index]');
const dialogClose = document.querySelector<HTMLButtonElement>('[data-dialog-close]');

const fillDialog = (row: HTMLElement) => {
	if (dialogImg) {
		dialogImg.src = row.dataset.img ?? '';
		dialogImg.alt = `Interface preview of ${row.dataset.title ?? ''}`;
		const width = Number(row.dataset.width);
		const height = Number(row.dataset.height);
		if (Number.isFinite(width) && width > 0) dialogImg.width = width;
		if (Number.isFinite(height) && height > 0) dialogImg.height = height;
	}
	if (dialogTitle) dialogTitle.textContent = row.dataset.title ?? '';
	if (dialogTag) dialogTag.textContent = row.dataset.tag ?? '';
	if (dialogIndex) dialogIndex.textContent = row.dataset.index ?? '';

	if (dialogStack) {
		dialogStack.replaceChildren();
		const stack = (row.dataset.stack ?? '').split(',').filter(Boolean);
		for (const item of stack) {
			const entry = document.createElement('li');
			entry.textContent = item;
			dialogStack.append(entry);
		}
	}
};

const openDialog = (row: HTMLElement) => {
	if (!dialog) return;
	fillDialog(row);
	if (typeof dialog.showModal === 'function') dialog.showModal();
	else dialog.setAttribute('open', '');
};

for (const row of projectRows) {
	row.addEventListener('click', () => openDialog(row));
}

dialogClose?.addEventListener('click', () => dialog?.close());
dialog?.addEventListener('click', (event) => {
	if (event.target === dialog) dialog.close();
});
dialog?.addEventListener('show', () => {
	document.body.style.overflow = 'hidden';
});
dialog?.addEventListener('close', () => {
	document.body.style.overflow = '';
});

const projectsToggle = document.querySelector<HTMLButtonElement>('[data-projects-toggle]');
const projectExtra = document.querySelector<HTMLElement>('[data-project-extra]');
const projectsLabel = projectsToggle?.querySelector<HTMLElement>('[data-projects-label]');
let projectsExpanded = false;

const setProjectsExpanded = (expanded: boolean) => {
	if (!projectExtra || !projectsToggle) return;
	projectsExpanded = expanded;
	projectsToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
	if (projectsLabel) projectsLabel.textContent = expanded ? 'Show less' : `See all ${projectRows.length} projects`;

	if (expanded) {
		projectExtra.removeAttribute('hidden');
		setInert(projectExtra, false);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => projectExtra.classList.add('is-open'));
		});
		observeReveals(projectExtra);
		return;
	}

	projectExtra.classList.remove('is-open');
	setInert(projectExtra, true);
	window.setTimeout(() => {
		if (!projectsExpanded) projectExtra.setAttribute('hidden', '');
	}, 560);
};

projectsToggle?.addEventListener('click', () => setProjectsExpanded(!projectsExpanded));

document.querySelectorAll<HTMLElement>('[data-accordion]').forEach((item) => {
	const trigger = item.querySelector<HTMLButtonElement>('[data-accordion-trigger]');
	if (!trigger) return;
	trigger.addEventListener('click', () => {
		const expanded = trigger.getAttribute('aria-expanded') === 'true';
		trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
		item.classList.toggle('is-open', !expanded);
	});
});

const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
const formFields = form?.querySelector<HTMLElement>('[data-form-fields]');
const formSuccess = form?.querySelector<HTMLElement>('[data-form-success]');
const formStatus = form?.querySelector<HTMLElement>('[data-form-status]');
const formReset = form?.querySelector<HTMLButtonElement>('[data-form-reset]');
const submitButton = form?.querySelector<HTMLButtonElement>('[data-submit]');
const submitLabel = form?.querySelector<HTMLElement>('[data-submit-label]');

const setFormStatus = (message: string, error = false) => {
	if (!formStatus) return;
	formStatus.textContent = message;
	formStatus.classList.toggle('is-error', error);
};

const setFormLoading = (loading: boolean) => {
	if (submitButton) submitButton.disabled = loading;
	if (submitLabel) submitLabel.textContent = loading ? 'Sending...' : 'Send message';
	form?.setAttribute('aria-busy', loading ? 'true' : 'false');
};

form?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!form.reportValidity()) return;

	setFormLoading(true);
	setFormStatus('Sending your message.');

	try {
		const payload = new URLSearchParams();
		new FormData(form).forEach((value, key) => {
			if (typeof value === 'string') payload.append(key, value);
		});

		const response = await fetch('/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: payload.toString(),
		});

		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		form.reset();
		if (formFields) formFields.hidden = true;
		if (formSuccess) formSuccess.hidden = false;
		setFormStatus('');
		formReset?.focus();
	} catch {
		setFormStatus('Message did not go through. Try again, or email dimasputranugrh@gmail.com.', true);
	} finally {
		setFormLoading(false);
	}
});

form?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((field) => {
	field.addEventListener('input', () => {
		if (formStatus?.classList.contains('is-error')) setFormStatus('');
	});
});

formReset?.addEventListener('click', () => {
	if (formFields) formFields.hidden = false;
	if (formSuccess) formSuccess.hidden = true;
	setFormStatus('');
	form?.querySelector<HTMLInputElement>('#contact-name')?.focus();
});

const copyButton = document.querySelector<HTMLButtonElement>('[data-copy-email]');
const copyLabel = document.querySelector<HTMLElement>('[data-copy-label]');
let copyTimer = 0;

const markCopied = () => {
	if (!copyLabel) return;
	copyLabel.textContent = 'Copied';
	window.clearTimeout(copyTimer);
	copyTimer = window.setTimeout(() => {
		copyLabel.textContent = 'Copy';
	}, 2200);
};

copyButton?.addEventListener('click', async () => {
	const email = copyButton.dataset.email;
	if (!email) return;

	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(email);
		} else {
			const textarea = document.createElement('textarea');
			textarea.value = email;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.append(textarea);
			textarea.select();
			document.execCommand('copy');
			textarea.remove();
		}
		markCopied();
	} catch {
		if (copyLabel) copyLabel.textContent = 'Copy manually';
		window.getSelection()?.selectAllChildren(copyButton);
	}
});

const clocks = Array.from(document.querySelectorAll<HTMLElement>('[data-clock]'));
const timeFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Asia/Jakarta',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});

const updateClocks = () => {
	const time = timeFormat.format(new Date());
	for (const clock of clocks) clock.textContent = time;
};

updateClocks();
window.setInterval(updateClocks, 30000);
