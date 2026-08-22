(() => {
	'use strict';

	/* ---------------------------------------------------------
	   Config
	   Replace with your deployed Netlify Functions site URL,
	   e.g. "https://nutrikalkulacka-api.netlify.app/.netlify/functions"
	--------------------------------------------------------- */
	const API_BASE =
		'https://cosmic-mooncake-74eea9.netlify.app/.netlify/functions';

	/* ---------------------------------------------------------
	   State
	--------------------------------------------------------- */
	let recipes = [];
	let activeChips = new Set();
	let searchTerm = '';
	let sortMode = 'default';
	let hideRestricted = false;

	let session = null; // { token, username, settings }

	const CHIP_ORDER = [
		'raňajky',
		'desiata',
		'obed',
		'večera',
		'dezert',
		'šalát',
		'polievka',
		'vegetariánske',
		'vegánske',
		'low carb',
		'meal prep',
	];
	const FAVORITES_CHIP = '__favorites__';

	/* ---------------------------------------------------------
	   Elements
	--------------------------------------------------------- */
	const el = {
		viewList: document.getElementById('view-list'),
		viewDetail: document.getElementById('view-detail'),
		grid: document.getElementById('card-grid'),
		chipRow: document.getElementById('chip-row'),
		searchInput: document.getElementById('search-input'),
		sortSelect: document.getElementById('sort-select'),
		resultCount: document.getElementById('result-count'),
		emptyState: document.getElementById('empty-state'),
		backBtn: document.getElementById('back-btn'),
		detailContent: document.getElementById('detail-content'),
		hideRestrictedRow: document.getElementById('hide-restricted-row'),
		hideRestrictedCheckbox: document.getElementById('hide-restricted'),

		accountSignedOutBtn: document.getElementById('account-signed-out-btn'),
		accountSignedIn: document.getElementById('account-signed-in'),
		accountMenuBtn: document.getElementById('account-menu-btn'),
		accountMenu: document.getElementById('account-menu'),
		accountUsername: document.getElementById('account-username'),
		openSettingsBtn: document.getElementById('open-settings-btn'),
		logoutBtn: document.getElementById('logout-btn'),

		authDialog: document.getElementById('auth-dialog'),
		authForm: document.querySelector('#auth-dialog .dialog__form'),
		authError: document.getElementById('auth-error'),
		authUsername: document.getElementById('auth-username'),
		authPasscode: document.getElementById('auth-passcode'),
		authSubmitBtn: document.getElementById('auth-submit-btn'),
		authCancelBtn: document.getElementById('auth-cancel-btn'),
		tabLogin: document.getElementById('tab-login'),
		tabSignup: document.getElementById('tab-signup'),

		settingsDialog: document.getElementById('settings-dialog'),
		settingsForm: document.querySelector('#settings-dialog .dialog__form'),
		settingsError: document.getElementById('settings-error'),
		settingsRestrictions: document.getElementById('settings-restrictions'),
		targetKcal: document.getElementById('target-kcal'),
		targetProtein: document.getElementById('target-protein'),
		targetCarbs: document.getElementById('target-carbs'),
		targetFat: document.getElementById('target-fat'),
		settingsCancelBtn: document.getElementById('settings-cancel-btn'),

		authRecoveryFields: document.getElementById('auth-recovery-fields'),
		authRecoveryQuestion: document.getElementById('auth-recovery-question'),
		authRecoveryAnswer: document.getElementById('auth-recovery-answer'),
		forgotPasswordLink: document.getElementById('forgot-password-link'),

		forgotDialog: document.getElementById('forgot-dialog'),
		forgotForm: document.querySelector('#forgot-dialog .dialog__form'),
		forgotError: document.getElementById('forgot-error'),
		forgotStepUsername: document.getElementById('forgot-step-username'),
		forgotStepAnswer: document.getElementById('forgot-step-answer'),
		forgotUsername: document.getElementById('forgot-username'),
		forgotNextBtn: document.getElementById('forgot-next-btn'),
		forgotCancelBtn: document.getElementById('forgot-cancel-btn'),
		forgotQuestion: document.getElementById('forgot-question'),
		forgotAnswer: document.getElementById('forgot-answer'),
		forgotNewPassword: document.getElementById('forgot-new-password'),
		forgotBackBtn: document.getElementById('forgot-back-btn'),

		openAccountBtn: document.getElementById('open-account-btn'),
		accountDialog: document.getElementById('account-dialog'),
		accountForm: document.querySelector('#account-dialog .dialog__form'),
		accountError: document.getElementById('account-error'),
		accountSuccess: document.getElementById('account-success'),
		accountCurrentPassword: document.getElementById('account-current-password'),
		accountNewUsername: document.getElementById('account-new-username'),
		accountNewPassword: document.getElementById('account-new-password'),
		accountCancelBtn: document.getElementById('account-cancel-btn'),
	};

	/* ---------------------------------------------------------
	   Icons (inline, reused)
	--------------------------------------------------------- */
	const ICON_CLOCK =
		'<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.4"/><path d="M10 6v4.2l2.8 1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	const ICON_SERVINGS =
		'<svg viewBox="0 0 20 20" fill="none"><path d="M6 3v6a1.5 1.5 0 0 0 3 0V3M7.5 9v8M14 3c-1.1 0-2 1.4-2 4s.9 4 2 4 2-1.4 2-4-.9-4-2-4Zm0 8v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	const ICON_STAR_OUTLINE =
		'<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
	const ICON_STAR_FILLED =
		'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.4 5.9.7-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.7Z"/></svg>';
	const ICON_WARN =
		'<svg viewBox="0 0 20 20" fill="none"><path d="M10 3.5 2.5 16h15L10 3.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 8v3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="10" cy="13.6" r="0.6" fill="currentColor"/></svg>';

	/* ---------------------------------------------------------
	   Formatting helpers
	--------------------------------------------------------- */
	function formatAmount(ing) {
		if (ing.amount === null || ing.amount === undefined) {
			return ing.unit || 'podľa chuti';
		}
		const amount = Number.isInteger(ing.amount)
			? ing.amount
			: ing.amount.toLocaleString('sk-SK', { maximumFractionDigits: 2 });
		const unit =
			ing.unit && ing.unit !== 'ks'
				? ` ${ing.unit}`
				: ing.unit === 'ks'
					? ' ks'
					: '';
		return `${amount}${unit}`;
	}

	function titleCase(word) {
		return word.charAt(0).toUpperCase() + word.slice(1);
	}

	function servingWord(n) {
		return n === 1 ? 'porcia' : n < 5 ? 'porcie' : 'porcií';
	}

	/* ---------------------------------------------------------
	   Session persistence
	--------------------------------------------------------- */
	function saveSession() {
		if (session) {
			localStorage.setItem('nc_session', JSON.stringify(session));
		} else {
			localStorage.removeItem('nc_session');
		}
	}

	function loadSessionFromStorage() {
		try {
			const raw = localStorage.getItem('nc_session');
			return raw ? JSON.parse(raw) : null;
		} catch {
			return null;
		}
	}

	async function apiFetch(path, options = {}) {
		const headers = {
			'Content-Type': 'application/json',
			...(options.headers || {}),
		};
		if (session && session.token) {
			headers.Authorization = `Bearer ${session.token}`;
		}
		const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || 'Niečo sa pokazilo.');
		}
		return data;
	}

	async function apiFetchNoAuth(path, options) {
		const res = await fetch(`${API_BASE}${path}`, {
			...options,
			headers: { 'Content-Type': 'application/json' },
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.error || 'Niečo sa pokazilo.');
		return data;
	}

	/* ---------------------------------------------------------
	   Auth UI
	--------------------------------------------------------- */
	function renderAccountUI() {
		if (session) {
			el.accountSignedOutBtn.hidden = true;
			el.accountSignedIn.hidden = false;
			el.accountUsername.textContent = session.username;
		} else {
			el.accountSignedOutBtn.hidden = false;
			el.accountSignedIn.hidden = true;
			el.accountMenu.hidden = true;
		}

		const hasRestrictions = !!(
			session &&
			session.settings.restrictions &&
			session.settings.restrictions.length
		);
		el.hideRestrictedRow.hidden = !hasRestrictions;
		if (!hasRestrictions) hideRestricted = false;
	}

	let authMode = 'login';
	function setAuthMode(mode) {
		authMode = mode;
		el.tabLogin.setAttribute('aria-selected', String(mode === 'login'));
		el.tabSignup.setAttribute('aria-selected', String(mode === 'signup'));
		el.authSubmitBtn.textContent =
			mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet';
		el.authPasscode.autocomplete =
			mode === 'login' ? 'current-password' : 'new-password';
		el.authRecoveryFields.hidden = mode !== 'signup';
		el.forgotPasswordLink.hidden = mode !== 'login';
		el.authError.hidden = true;
	}

	el.accountSignedOutBtn.addEventListener('click', () => {
		setAuthMode('login');
		el.authForm.reset();
		el.authDialog.showModal();
	});

	el.tabLogin.addEventListener('click', () => setAuthMode('login'));
	el.tabSignup.addEventListener('click', () => setAuthMode('signup'));
	el.authCancelBtn.addEventListener('click', () => el.authDialog.close());

	el.authForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		el.authError.hidden = true;
		const username = el.authUsername.value.trim();
		const passcode = el.authPasscode.value;

		try {
			const endpoint = authMode === 'login' ? '/login' : '/signup';
			const payload = { username, passcode };
			if (authMode === 'signup') {
				payload.recoveryQuestion = el.authRecoveryQuestion.value.trim();
				payload.recoveryAnswer = el.authRecoveryAnswer.value.trim();
			}
			const data = await apiFetchNoAuth(endpoint, {
				method: 'POST',
				body: JSON.stringify(payload),
			});
			session = {
				token: data.token,
				username: data.username,
				settings: data.settings,
			};
			saveSession();
			renderAccountUI();
			buildChips();
			render();
			el.authDialog.close();
		} catch (err) {
			el.authError.textContent = err.message;
			el.authError.hidden = false;
		}
	});

	el.accountMenuBtn.addEventListener('click', () => {
		const isOpen = !el.accountMenu.hidden;
		el.accountMenu.hidden = isOpen;
		el.accountMenuBtn.setAttribute('aria-expanded', String(!isOpen));
	});

	document.addEventListener('click', (e) => {
		if (!el.accountSignedIn.contains(e.target)) {
			el.accountMenu.hidden = true;
		}
	});

	el.logoutBtn.addEventListener('click', () => {
		session = null;
		activeChips.delete(FAVORITES_CHIP);
		saveSession();
		renderAccountUI();
		buildChips();
		render();
		el.accountMenu.hidden = true;
	});

	/* ---------------------------------------------------------
	   Settings dialog
	--------------------------------------------------------- */
	el.openSettingsBtn.addEventListener('click', () => {
		el.accountMenu.hidden = true;
		el.settingsError.hidden = true;
		const s = session.settings;
		el.settingsRestrictions.value = (s.restrictions || []).join(', ');
		el.targetKcal.value = s.targets?.kcal ?? '';
		el.targetProtein.value = s.targets?.protein_g ?? '';
		el.targetCarbs.value = s.targets?.carbs_g ?? '';
		el.targetFat.value = s.targets?.fat_g ?? '';
		el.settingsDialog.showModal();
	});

	el.settingsCancelBtn.addEventListener('click', () =>
		el.settingsDialog.close(),
	);

	el.settingsForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		el.settingsError.hidden = true;

		const restrictions = el.settingsRestrictions.value
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		const toNum = (v) => (v.trim() === '' ? null : Number(v));
		const targets = {
			kcal: toNum(el.targetKcal.value),
			protein_g: toNum(el.targetProtein.value),
			carbs_g: toNum(el.targetCarbs.value),
			fat_g: toNum(el.targetFat.value),
		};

		try {
			const data = await apiFetch('/settings', {
				method: 'PUT',
				body: JSON.stringify({ restrictions, targets }),
			});
			session.settings = data.settings;
			saveSession();
			renderAccountUI();
			render();
			el.settingsDialog.close();
		} catch (err) {
			el.settingsError.textContent = err.message;
			el.settingsError.hidden = false;
		}
	});

	/* ---------------------------------------------------------
	   Forgot password
	--------------------------------------------------------- */
	function resetForgotDialog() {
		el.forgotError.hidden = true;
		el.forgotStepUsername.hidden = false;
		el.forgotStepAnswer.hidden = true;
		el.forgotUsername.value = '';
		el.forgotAnswer.value = '';
		el.forgotNewPassword.value = '';
		el.forgotQuestion.textContent = '';
	}

	el.forgotPasswordLink.addEventListener('click', () => {
		el.authDialog.close();
		resetForgotDialog();
		el.forgotDialog.showModal();
	});

	el.forgotCancelBtn.addEventListener('click', () => el.forgotDialog.close());
	el.forgotBackBtn.addEventListener('click', () => {
		el.forgotStepAnswer.hidden = true;
		el.forgotStepUsername.hidden = false;
		el.forgotError.hidden = true;
	});

	el.forgotNextBtn.addEventListener('click', async () => {
		el.forgotError.hidden = true;
		const username = el.forgotUsername.value.trim();
		if (!username) return;

		try {
			const data = await apiFetchNoAuth(
				`/forgot-password?username=${encodeURIComponent(username)}`,
				{
					method: 'GET',
				},
			);
			el.forgotQuestion.textContent = data.question;
			el.forgotStepUsername.hidden = true;
			el.forgotStepAnswer.hidden = false;
		} catch (err) {
			el.forgotError.textContent = err.message;
			el.forgotError.hidden = false;
		}
	});

	el.forgotForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (el.forgotStepAnswer.hidden) return; // Enter pressed on step 1 — ignore, use "Ďalej" instead
		el.forgotError.hidden = true;

		try {
			const data = await apiFetchNoAuth('/forgot-password', {
				method: 'POST',
				body: JSON.stringify({
					username: el.forgotUsername.value.trim(),
					answer: el.forgotAnswer.value,
					newPassword: el.forgotNewPassword.value,
				}),
			});
			session = {
				token: data.token,
				username: data.username,
				settings: data.settings,
			};
			saveSession();
			renderAccountUI();
			buildChips();
			render();
			el.forgotDialog.close();
		} catch (err) {
			el.forgotError.textContent = err.message;
			el.forgotError.hidden = false;
		}
	});

	/* ---------------------------------------------------------
	   Account (change username / password)
	--------------------------------------------------------- */
	el.openAccountBtn.addEventListener('click', () => {
		el.accountMenu.hidden = true;
		el.accountError.hidden = true;
		el.accountSuccess.hidden = true;
		el.accountForm.reset();
		el.accountDialog.showModal();
	});

	el.accountCancelBtn.addEventListener('click', () => el.accountDialog.close());

	el.accountForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		el.accountError.hidden = true;
		el.accountSuccess.hidden = true;

		const currentPassword = el.accountCurrentPassword.value;
		const newUsername = el.accountNewUsername.value.trim();
		const newPassword = el.accountNewPassword.value;

		try {
			const data = await apiFetch('/account', {
				method: 'PUT',
				body: JSON.stringify({
					currentPassword,
					newUsername: newUsername || null,
					newPassword: newPassword || null,
				}),
			});
			session = {
				token: data.token,
				username: data.username,
				settings: data.settings,
			};
			saveSession();
			renderAccountUI();
			el.accountSuccess.textContent = 'Zmeny uložené.';
			el.accountSuccess.hidden = false;
			el.accountForm.reset();
			setTimeout(() => el.accountDialog.close(), 1000);
		} catch (err) {
			el.accountError.textContent = err.message;
			el.accountError.hidden = false;
		}
	});

	/* ---------------------------------------------------------
	   Favorites
	--------------------------------------------------------- */
	function isFavorite(id) {
		return !!(
			session &&
			session.settings.favorites &&
			session.settings.favorites.includes(id)
		);
	}

	async function toggleFavorite(id) {
		if (!session) {
			el.accountSignedOutBtn.click();
			return;
		}
		const current = session.settings.favorites || [];
		const next = current.includes(id)
			? current.filter((x) => x !== id)
			: [...current, id];
		session.settings.favorites = next; // optimistic update
		saveSession();
		render();
		if (!el.viewDetail.hidden) {
			const match = window.location.hash.match(/^#\/recipe\/(\d+)/);
			if (match) renderDetail(match[1]);
		}
		try {
			const data = await apiFetch('/settings', {
				method: 'PUT',
				body: JSON.stringify({ favorites: next }),
			});
			session.settings = data.settings;
			saveSession();
		} catch (err) {
			console.error('Uloženie obľúbeného zlyhalo:', err);
		}
	}

	/* ---------------------------------------------------------
	   Restrictions / targets helpers
	--------------------------------------------------------- */
	function matchedRestriction(recipe) {
		if (
			!session ||
			!session.settings.restrictions ||
			!session.settings.restrictions.length
		)
			return null;
		const restrictions = session.settings.restrictions.map((r) =>
			r.toLowerCase(),
		);
		for (const ing of recipe.ingredients) {
			const name = ing.name.toLowerCase();
			const hit = restrictions.find((r) => name.includes(r));
			if (hit) return hit;
		}
		return null;
	}

	function targetPercent(kcal) {
		const target = session?.settings?.targets?.kcal;
		if (!target) return null;
		return Math.round((kcal / target) * 100);
	}

	/* ---------------------------------------------------------
	   Data loading
	--------------------------------------------------------- */
	async function loadRecipes() {
		try {
			const res = await fetch(`${API_BASE}/recipes`);
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				throw new Error(
					(data && data.error) || `Server vrátil chybu ${res.status}.`,
				);
			}
			if (!Array.isArray(data)) {
				throw new Error('Server vrátil neočakávanú odpoveď.');
			}
			recipes = data;
		} catch (err) {
			el.grid.innerHTML = `<p style="color:var(--text-faint);grid-column:1/-1;">Recepty sa nepodarilo načítať: ${err.message}</p>`;
			console.error(err);
			return;
		}
		buildChips();
		render();
		route();
	}

	function buildChips() {
		const counts = {};
		recipes.forEach((r) =>
			r.meal_type.forEach((m) => (counts[m] = (counts[m] || 0) + 1)),
		);
		const ordered = CHIP_ORDER.filter((m) => counts[m]);

		el.chipRow.innerHTML = '';

		if (session) {
			const favBtn = document.createElement('button');
			favBtn.type = 'button';
			favBtn.className = 'chip';
			favBtn.dataset.chip = FAVORITES_CHIP;
			favBtn.setAttribute(
				'aria-pressed',
				String(activeChips.has(FAVORITES_CHIP)),
			);
			favBtn.textContent = '★ Obľúbené';
			favBtn.addEventListener('click', () =>
				toggleChip(favBtn, FAVORITES_CHIP),
			);
			el.chipRow.appendChild(favBtn);
		}

		ordered.forEach((m) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'chip';
			btn.dataset.chip = m;
			btn.setAttribute('aria-pressed', String(activeChips.has(m)));
			btn.textContent = `${titleCase(m)} (${counts[m]})`;
			btn.addEventListener('click', () => toggleChip(btn, m));
			el.chipRow.appendChild(btn);
		});
	}

	function toggleChip(btn, key) {
		if (activeChips.has(key)) {
			activeChips.delete(key);
			btn.setAttribute('aria-pressed', 'false');
		} else {
			activeChips.add(key);
			btn.setAttribute('aria-pressed', 'true');
		}
		render();
	}

	/* ---------------------------------------------------------
	   Filtering + sorting
	--------------------------------------------------------- */
	function getFiltered() {
		let list = recipes;

		const mealChips = new Set(
			[...activeChips].filter((c) => c !== FAVORITES_CHIP),
		);
		if (mealChips.size > 0) {
			list = list.filter((r) => r.meal_type.some((m) => mealChips.has(m)));
		}

		if (activeChips.has(FAVORITES_CHIP)) {
			list = list.filter((r) => isFavorite(r.id));
		}

		if (searchTerm.trim()) {
			const term = searchTerm.trim().toLowerCase();
			list = list.filter((r) => {
				if (r.title.toLowerCase().includes(term)) return true;
				return r.ingredients.some((i) => i.name.toLowerCase().includes(term));
			});
		}

		if (hideRestricted) {
			list = list.filter((r) => !matchedRestriction(r));
		}

		const sorted = [...list];
		switch (sortMode) {
			case 'kcal-asc':
				sorted.sort(
					(a, b) => a.nutrition_per_serving.kcal - b.nutrition_per_serving.kcal,
				);
				break;
			case 'kcal-desc':
				sorted.sort(
					(a, b) => b.nutrition_per_serving.kcal - a.nutrition_per_serving.kcal,
				);
				break;
			case 'time-asc':
				sorted.sort(
					(a, b) => (a.time_minutes ?? 9999) - (b.time_minutes ?? 9999),
				);
				break;
			case 'protein-desc':
				sorted.sort(
					(a, b) =>
						b.nutrition_per_serving.protein_g -
						a.nutrition_per_serving.protein_g,
				);
				break;
			case 'title-asc':
				sorted.sort((a, b) => a.title.localeCompare(b.title, 'sk'));
				break;
			default:
				break;
		}
		return sorted;
	}

	/* ---------------------------------------------------------
	   Card rendering
	--------------------------------------------------------- */
	function cardTemplate(r) {
		const n = r.nutrition_per_serving;
		const tags = r.meal_type
			.slice(0, 3)
			.map((m) => `<span class="tag">${titleCase(m)}</span>`)
			.join('');

		const restriction = matchedRestriction(r);
		const pct = targetPercent(n.kcal);
		const fav = isFavorite(r.id);

		return `
			<div class="recipe-card" data-id="${r.id}" tabindex="0" role="button" aria-label="Zobraziť recept: ${r.title}">
				<div class="recipe-card__top">
					<h2 class="recipe-card__title">${r.title}</h2>
					<button class="fav-btn" data-fav-id="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}">
						${fav ? ICON_STAR_FILLED : ICON_STAR_OUTLINE}
					</button>
				</div>
				<div class="recipe-card__tags">${tags}</div>
				${restriction ? `<div class="restriction-flag">${ICON_WARN} obsahuje: ${restriction}</div>` : ''}
				<div class="nlabel">
					<div class="nlabel__headline">
						<div>
							<span class="nlabel__kcal">${n.kcal}</span>
							<div class="nlabel__kcal-unit">kcal</div>
							${pct !== null ? `<div class="target-pct">${pct}&nbsp;% denného cieľa</div>` : ''}
						</div>
						<div class="nlabel__per">na 1 porciu z ${r.servings}</div>
					</div>
					<div class="nlabel__rows">
						<div class="nlabel__row"><span class="nlabel__row-label">Bielkoviny</span><span class="nlabel__row-value">${n.protein_g} g</span></div>
						<div class="nlabel__row"><span class="nlabel__row-label">Sacharidy</span><span class="nlabel__row-value">${n.carbs_g} g</span></div>
						<div class="nlabel__row"><span class="nlabel__row-label">Tuky</span><span class="nlabel__row-value">${n.fat_g} g</span></div>
					</div>
				</div>
				<div class="recipe-card__meta">
					${r.time_minutes ? `<span>${ICON_CLOCK} ${r.time_minutes} min</span>` : ''}
					<span>${ICON_SERVINGS} ${r.servings} ${servingWord(r.servings)}</span>
				</div>
			</div>
		`;
	}

	function render() {
		const list = getFiltered();
		el.resultCount.textContent = `Zobrazených ${list.length} z ${recipes.length} receptov`;
		el.emptyState.hidden = list.length !== 0;
		el.grid.innerHTML = list.map(cardTemplate).join('');

		el.grid.querySelectorAll('.recipe-card').forEach((card) => {
			const open = () => {
				window.location.hash = `#/recipe/${card.dataset.id}`;
			};
			card.addEventListener('click', (e) => {
				if (e.target.closest('.fav-btn')) return;
				open();
			});
			card.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					open();
				}
			});
		});

		el.grid.querySelectorAll('.fav-btn').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				toggleFavorite(Number(btn.dataset.favId));
			});
		});
	}

	/* ---------------------------------------------------------
	   Detail rendering
	--------------------------------------------------------- */
	function detailTemplate(r) {
		const n = r.nutrition_per_serving;
		const tags = r.meal_type
			.map((m) => `<span class="tag">${titleCase(m)}</span>`)
			.join('');
		const restriction = matchedRestriction(r);
		const pct = targetPercent(n.kcal);
		const fav = isFavorite(r.id);

		const ingredientRows = r.ingredients
			.map(
				(ing) => `
			<li>
				<span class="ingredient-list__name">${titleCase(ing.name)}${
					ing.optional ? '<span class="optional-tag">voliteľné</span>' : ''
				}${ing.note ? `<span class="optional-tag">${ing.note}</span>` : ''}</span>
				<span class="ingredient-list__amount">${formatAmount(ing)}</span>
			</li>`,
			)
			.join('');

		const procedureRows = r.procedure
			.map((step) => `<li>${step}</li>`)
			.join('');

		const sourceLine =
			r.source_site || r.author
				? `<p class="source-note">Recept inšpirovaný receptom${r.author ? ` od ${r.author}` : ''}${
						r.source_site ? `, ${r.source_site}` : ''
					}.${r.source_url ? ` <a href="${r.source_url}" target="_blank" rel="noopener">Pôvodný zdroj →</a>` : ''}</p>`
				: '';

		return `
			<div class="detail-header">
				<div class="detail-header__top">
					<h1 class="detail-header__title">${r.title}</h1>
					<button class="fav-btn fav-btn--lg" data-fav-id="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}">
						${fav ? ICON_STAR_FILLED : ICON_STAR_OUTLINE}
					</button>
				</div>
				<div class="detail-header__tags">${tags}</div>
				${restriction ? `<div class="restriction-flag">${ICON_WARN} obsahuje: ${restriction}</div>` : ''}
				<div class="detail-header__meta">
					${r.time_minutes ? `<span>${ICON_CLOCK} ${r.time_minutes} min</span>` : ''}
					<span>${ICON_SERVINGS} ${r.servings} ${servingWord(r.servings)}</span>
				</div>
			</div>

			<div class="detail-grid">
				<aside class="facts">
					<p class="facts__eyebrow">Nutričné hodnoty</p>
					<p class="facts__serving">Na 1 porciu (recept má ${r.servings} ${servingWord(r.servings)})</p>
					<div class="facts__kcal-row">
						<span class="facts__kcal-label">Kalórie</span>
						<span class="facts__kcal-value">${n.kcal}</span>
					</div>
					${pct !== null ? `<p class="target-pct">${pct}&nbsp;% tvojho denného cieľa</p>` : ''}
					<div class="facts__rows">
						<div class="facts__row"><span class="facts__row-label">Bielkoviny</span><span class="facts__row-value">${n.protein_g} g</span></div>
						<div class="facts__row"><span class="facts__row-label">Sacharidy</span><span class="facts__row-value">${n.carbs_g} g</span></div>
						<div class="facts__row"><span class="facts__row-label">Tuky</span><span class="facts__row-value">${n.fat_g} g</span></div>
						<div class="facts__row"><span class="facts__row-label">Vláknina</span><span class="facts__row-value">${n.fiber_g} g</span></div>
					</div>
					<p class="facts__footnote">Hodnoty sú orientačné, prepočítané na jednu porciu z celkového množstva receptu.</p>
				</aside>

				<div>
					<section class="detail-section">
						<h2 class="detail-section__title">Ingrediencie</h2>
						<ul class="ingredient-list">${ingredientRows}</ul>
					</section>

					<section class="detail-section">
						<h2 class="detail-section__title">Postup</h2>
						<ol class="procedure-list">${procedureRows}</ol>
					</section>

					${sourceLine}
				</div>
			</div>
		`;
	}

	function renderDetail(id) {
		const recipe = recipes.find((r) => String(r.id) === String(id));
		if (!recipe) {
			el.detailContent.innerHTML = '<p>Tento recept sa nenašiel.</p>';
			return;
		}
		el.detailContent.innerHTML = detailTemplate(recipe);
		document.title = `${recipe.title} — Nutrikalkulačka od Hany`;

		const favBtn = el.detailContent.querySelector('.fav-btn');
		if (favBtn) {
			favBtn.addEventListener('click', () =>
				toggleFavorite(Number(favBtn.dataset.favId)),
			);
		}
	}

	/* ---------------------------------------------------------
	   Routing
	--------------------------------------------------------- */
	function route() {
		const hash = window.location.hash;
		const match = hash.match(/^#\/recipe\/(\d+)/);

		if (match) {
			renderDetail(match[1]);
			el.viewList.hidden = true;
			el.viewDetail.hidden = false;
			window.scrollTo({
				top: 0,
				behavior: 'instant' in window ? 'instant' : 'auto',
			});
		} else {
			el.viewList.hidden = false;
			el.viewDetail.hidden = true;
			document.title = 'Nutrikalkulačka od Hany';
		}
	}

	el.backBtn.addEventListener('click', () => {
		window.location.hash = '#/';
	});

	window.addEventListener('hashchange', route);

	/* ---------------------------------------------------------
	   Toolbar events
	--------------------------------------------------------- */
	let searchDebounce;
	el.searchInput.addEventListener('input', (e) => {
		clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			searchTerm = e.target.value;
			render();
		}, 120);
	});

	el.sortSelect.addEventListener('change', (e) => {
		sortMode = e.target.value;
		render();
	});

	el.hideRestrictedCheckbox.addEventListener('change', (e) => {
		hideRestricted = e.target.checked;
		render();
	});

	/* ---------------------------------------------------------
	   Init
	--------------------------------------------------------- */
	async function init() {
		session = loadSessionFromStorage();
		renderAccountUI();

		if (session) {
			try {
				const data = await apiFetch('/settings');
				session.settings = data.settings;
				saveSession();
				renderAccountUI();
			} catch {
				session = null;
				saveSession();
				renderAccountUI();
			}
		}

		await loadRecipes();
	}

	init();
})();
