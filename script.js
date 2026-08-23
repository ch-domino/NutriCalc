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
	let withinTargetOnly = false;

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
		viewGate: document.getElementById('view-gate'),
		gateLoginBtn: document.getElementById('gate-login-btn'),
		planBtn: document.getElementById('plan-btn'),
		planCount: document.getElementById('plan-count'),
		planDialog: document.getElementById('plan-dialog'),
		planCloseBtn: document.getElementById('plan-close-btn'),
		planList: document.getElementById('plan-list'),
		planEmpty: document.getElementById('plan-empty'),
		planGenerateBtn: document.getElementById('plan-generate-btn'),

		shoppingListDialog: document.getElementById('shopping-list-dialog'),
		shoppingListItems: document.getElementById('shopping-list-items'),
		shoppingListEmpty: document.getElementById('shopping-list-empty'),
		shoppingListCloseBtn: document.getElementById('shopping-list-close-btn'),
		shoppingListBackBtn: document.getElementById('shopping-list-back-btn'),
		shoppingListCopyBtn: document.getElementById('shopping-list-copy-btn'),
		shoppingListTxtBtn: document.getElementById('shopping-list-txt-btn'),
		shoppingListImgBtn: document.getElementById('shopping-list-img-btn'),
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
		withinTargetRow: document.getElementById('within-target-row'),
		withinTargetCheckbox: document.getElementById('within-target'),

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
		accountDeleteBtn: document.getElementById('account-delete-btn'),
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
	const ICON_PLAN_ADD =
		'<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M12 10.5v6M9 13.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
	const ICON_PLAN_CHECK =
		'<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 13l2.4 2.5L15.5 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	const ICON_WARN_REMOVE =
		'<svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

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
		// The signed-out header button used to duplicate the gate's own
		// "Prihlásiť sa" button — since the gate is the only thing visible
		// while logged out anyway, the header button is kept out of view
		// and only triggered programmatically (see gate-login-btn below).
		el.accountSignedOutBtn.hidden = true;

		if (session) {
			el.accountSignedIn.hidden = false;
			el.accountUsername.textContent = session.username;
		} else {
			el.accountSignedIn.hidden = true;
			el.accountMenu.hidden = true;
		}

		const hasRestrictions = !!(
			session &&
			session.settings.restrictions &&
			session.settings.restrictions.length
		);
		el.hideRestrictedRow.hidden = !hasRestrictions;
		if (!hasRestrictions) {
			hideRestricted = false;
			el.hideRestrictedCheckbox.checked = false;
		}

		const targets = session && session.settings.targets;
		const hasTargets = !!(
			targets &&
			(targets.kcal || targets.protein_g || targets.carbs_g || targets.fat_g)
		);
		el.withinTargetRow.hidden = !hasTargets;
		if (!hasTargets) {
			withinTargetOnly = false;
			el.withinTargetCheckbox.checked = false;
		}

		updatePlanBadge();
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
			el.authDialog.close();
			await loadRecipes();
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
		recipes = [];
		saveSession();
		renderAccountUI();
		el.accountMenu.hidden = true;
		window.location.hash = '#/';
		updateViewVisibility();
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
			el.forgotDialog.close();
			await loadRecipes();
		} catch (err) {
			el.forgotError.textContent = err.message;
			el.forgotError.hidden = false;
		}
	});

	/* ---------------------------------------------------------
	   Account (change username / password / delete)
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

	if (el.accountDeleteBtn) {
		el.accountDeleteBtn.addEventListener('click', async () => {
			el.accountError.hidden = true;
			el.accountSuccess.hidden = true;

			const currentPassword = el.accountCurrentPassword.value;
			if (!currentPassword) {
				el.accountError.textContent = 'Zadaj svoje heslo pre potvrdenie.';
				el.accountError.hidden = false;
				el.accountCurrentPassword.focus();
				return;
			}

			const confirmed = window.confirm(
				'Naozaj chceš natrvalo zmazať svoj účet? Túto akciu nie je možné vrátiť späť.',
			);
			if (!confirmed) return;

			try {
				await apiFetch('/delete-account', {
					method: 'DELETE',
					body: JSON.stringify({ currentPassword }),
				});
				session = null;
				activeChips.delete(FAVORITES_CHIP);
				recipes = [];
				saveSession();
				renderAccountUI();
				el.accountDialog.close();
				window.location.hash = '#/';
				updateViewVisibility();
			} catch (err) {
				el.accountError.textContent = err.message;
				el.accountError.hidden = false;
			}
		});
	}

	/* ---------------------------------------------------------
	   iOS Safari sometimes leaves the header stuck / un-tappable
	   after a dialog closes, if focus tries to return to a button
	   that was inside a menu we'd already hidden. Moving focus to
	   an always-visible header control on every dialog close
	   avoids that stuck state.
	--------------------------------------------------------- */
	function restoreHeaderFocus() {
		const target = session ? el.accountMenuBtn : el.gateLoginBtn;
		if (target) target.focus({ preventScroll: true });
	}

	[
		el.authDialog,
		el.forgotDialog,
		el.settingsDialog,
		el.accountDialog,
		el.planDialog,
		el.shoppingListDialog,
	].forEach((dialog) => {
		dialog.addEventListener('close', restoreHeaderFocus);
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
	   Meal plan (recipe -> how many times to cook it)
	--------------------------------------------------------- */
	function getPlan() {
		return (session && session.settings.plan) || [];
	}

	function planEntry(id) {
		return getPlan().find((p) => p.recipeId === id) || null;
	}

	function isPlanned(id) {
		return !!planEntry(id);
	}

	function planTotalCount() {
		return getPlan().length;
	}

	async function savePlan(next) {
		session.settings.plan = next; // optimistic update
		saveSession();
		render();
		renderPlanDialog();
		updatePlanBadge();
		if (!el.viewDetail.hidden) {
			const match = window.location.hash.match(/^#\/recipe\/(\d+)/);
			if (match) renderDetail(match[1]);
		}
		try {
			const data = await apiFetch('/settings', {
				method: 'PUT',
				body: JSON.stringify({ plan: next }),
			});
			session.settings = data.settings;
			saveSession();
		} catch (err) {
			console.error('Uloženie plánu zlyhalo:', err);
		}
	}

	function togglePlan(id) {
		if (!session) {
			el.accountSignedOutBtn.click();
			return;
		}
		const current = getPlan();
		const next = current.some((p) => p.recipeId === id)
			? current.filter((p) => p.recipeId !== id)
			: [...current, { recipeId: id, multiplier: 1 }];
		savePlan(next);
	}

	function setPlanMultiplier(id, multiplier) {
		const clamped = Math.min(30, Math.max(1, Math.round(multiplier)));
		const next = getPlan().map((p) =>
			p.recipeId === id ? { ...p, multiplier: clamped } : p,
		);
		savePlan(next);
	}

	function removeFromPlan(id) {
		const next = getPlan().filter((p) => p.recipeId !== id);
		savePlan(next);
	}

	function updatePlanBadge() {
		if (!session) {
			el.planBtn.hidden = true;
			return;
		}
		el.planBtn.hidden = false;
		const count = planTotalCount();
		el.planCount.hidden = count === 0;
		el.planCount.textContent = String(count);
	}

	/* ---------------------------------------------------------
	   Plan dialog
	--------------------------------------------------------- */
	function renderPlanDialog() {
		const plan = getPlan();

		if (plan.length === 0) {
			el.planList.innerHTML = '';
			el.planEmpty.hidden = false;
			el.planGenerateBtn.disabled = true;
			return;
		}
		el.planEmpty.hidden = true;
		el.planGenerateBtn.disabled = false;

		el.planList.innerHTML = plan
			.map((p) => {
				const recipe = recipes.find((r) => r.id === p.recipeId);
				if (!recipe) return '';
				return `
					<li class="plan-item" data-plan-id="${p.recipeId}">
						<span class="plan-item__name">${recipe.title}</span>
						<div class="plan-item__controls">
							<button type="button" class="plan-item__step" data-step="-1" aria-label="Menej">−</button>
							<span class="plan-item__multiplier">${p.multiplier}×</span>
							<button type="button" class="plan-item__step" data-step="1" aria-label="Viac">+</button>
							<button type="button" class="plan-item__remove" aria-label="Odobrať z plánu">${ICON_WARN_REMOVE}</button>
						</div>
					</li>
				`;
			})
			.join('');

		el.planList.querySelectorAll('.plan-item').forEach((li) => {
			const id = Number(li.dataset.planId);
			li.querySelectorAll('.plan-item__step').forEach((btn) => {
				btn.addEventListener('click', () => {
					const entry = planEntry(id);
					if (!entry) return;
					setPlanMultiplier(id, entry.multiplier + Number(btn.dataset.step));
				});
			});
			li.querySelector('.plan-item__remove').addEventListener('click', () =>
				removeFromPlan(id),
			);
		});
	}

	el.planBtn.addEventListener('click', () => {
		renderPlanDialog();
		el.planDialog.showModal();
	});
	el.planCloseBtn.addEventListener('click', () => el.planDialog.close());

	el.planGenerateBtn.addEventListener('click', () => {
		el.planDialog.close();
		renderShoppingList();
		el.shoppingListDialog.showModal();
	});

	/* ---------------------------------------------------------
	   Shopping list: aggregate ingredients across the plan
	--------------------------------------------------------- */
	const UNIT_BASE = {
		g: { base: 'g', factor: 1 },
		kg: { base: 'g', factor: 1000 },
		ml: { base: 'ml', factor: 1 },
		l: { base: 'ml', factor: 1000 },
	};

	function buildShoppingList() {
		const grouped = new Map();
		const noAmount = new Map();

		getPlan().forEach((p) => {
			const recipe = recipes.find((r) => r.id === p.recipeId);
			if (!recipe) return;
			const multiplier = p.multiplier || 1;

			recipe.ingredients.forEach((ing) => {
				if (ing.amount === null || ing.amount === undefined) {
					const key = ing.name.toLowerCase().trim();
					if (!noAmount.has(key))
						noAmount.set(key, { name: titleCase(ing.name) });
					return;
				}

				const unitInfo = ing.unit && UNIT_BASE[ing.unit];
				const baseUnit = unitInfo ? unitInfo.base : ing.unit || 'ks';
				const factor = unitInfo ? unitInfo.factor : 1;
				const key = `${ing.name.toLowerCase().trim()}|${baseUnit}`;
				const amountInBase = ing.amount * factor * multiplier;

				if (!grouped.has(key)) {
					grouped.set(key, {
						name: titleCase(ing.name),
						unit: baseUnit,
						amount: 0,
					});
				}
				grouped.get(key).amount += amountInBase;
			});
		});

		const items = [...grouped.values()].map((item) => {
			let { amount, unit } = item;
			if (unit === 'g' && amount >= 1000) {
				amount /= 1000;
				unit = 'kg';
			} else if (unit === 'ml' && amount >= 1000) {
				amount /= 1000;
				unit = 'l';
			}
			amount = Math.round(amount * 100) / 100;
			return { name: item.name, amount, unit };
		});

		items.sort((a, b) => a.name.localeCompare(b.name, 'sk'));
		const extras = [...noAmount.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'sk'),
		);

		return { items, extras };
	}

	function formatShoppingAmount(item) {
		const amt = Number.isInteger(item.amount)
			? item.amount
			: item.amount.toLocaleString('sk-SK', { maximumFractionDigits: 2 });
		const unitLabel =
			item.unit === 'ks' ? ' ks' : item.unit ? ` ${item.unit}` : '';
		return `${amt}${unitLabel}`;
	}

	function shoppingListToText(list) {
		const lines = ['NÁKUPNÝ ZOZNAM', ''];
		list.items.forEach((i) =>
			lines.push(`☐ ${i.name} — ${formatShoppingAmount(i)}`),
		);
		if (list.extras.length) {
			lines.push('', 'Podľa chuti:');
			list.extras.forEach((e) => lines.push(`☐ ${e.name}`));
		}
		return lines.join('\n');
	}

	function renderShoppingList() {
		const list = buildShoppingList();
		currentShoppingList = list;

		if (list.items.length === 0 && list.extras.length === 0) {
			el.shoppingListItems.innerHTML = '';
			el.shoppingListEmpty.hidden = false;
			return;
		}
		el.shoppingListEmpty.hidden = true;

		const itemRows = list.items
			.map(
				(i) =>
					`<li><span>${i.name}</span><span class="shopping-list__amount">${formatShoppingAmount(i)}</span></li>`,
			)
			.join('');
		const extraRows = list.extras.length
			? `<p class="shopping-list__subhead">Podľa chuti</p><ul class="shopping-list__items">${list.extras
					.map((e) => `<li><span>${e.name}</span></li>`)
					.join('')}</ul>`
			: '';

		el.shoppingListItems.innerHTML = `<ul class="shopping-list__items">${itemRows}</ul>${extraRows}`;
	}

	let currentShoppingList = { items: [], extras: [] };

	el.shoppingListCloseBtn.addEventListener('click', () =>
		el.shoppingListDialog.close(),
	);
	el.shoppingListBackBtn.addEventListener('click', () => {
		el.shoppingListDialog.close();
		renderPlanDialog();
		el.planDialog.showModal();
	});

	el.shoppingListCopyBtn.addEventListener('click', async () => {
		const text = shoppingListToText(currentShoppingList);
		try {
			await navigator.clipboard.writeText(text);
			el.shoppingListCopyBtn.textContent = 'Skopírované ✓';
			setTimeout(
				() => (el.shoppingListCopyBtn.textContent = 'Kopírovať text'),
				1500,
			);
		} catch {
			window.prompt('Skopíruj text manuálne:', text);
		}
	});

	el.shoppingListTxtBtn.addEventListener('click', () => {
		const text = shoppingListToText(currentShoppingList);
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'nakupny-zoznam.txt';
		a.click();
		URL.revokeObjectURL(url);
	});

	el.shoppingListImgBtn.addEventListener('click', async () => {
		const dataUrl = await shoppingListToImage(currentShoppingList);
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = 'nakupny-zoznam.png';
		a.click();
	});

	async function shoppingListToImage(list) {
		if (document.fonts && document.fonts.ready) {
			try {
				await document.fonts.ready;
			} catch {
				/* ignore — canvas will fall back to default fonts */
			}
		}

		const width = 640;
		const padding = 40;
		const lineHeight = 30;
		const titleHeight = 64;
		const subheadGap = 44;

		let lineCount = list.items.length;
		if (list.extras.length) lineCount += list.extras.length + 1;
		const height =
			titleHeight +
			Math.max(lineCount, 1) * lineHeight +
			padding * 2 +
			(list.extras.length ? subheadGap - lineHeight : 0);

		const canvas = document.createElement('canvas');
		const scale = 2; // sharper output on retina screens
		canvas.width = width * scale;
		canvas.height = height * scale;
		const ctx = canvas.getContext('2d');
		ctx.scale(scale, scale);

		ctx.fillStyle = '#14110d';
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = '#e0b93a';
		ctx.font = '700 26px Fraunces, Georgia, serif';
		ctx.fillText('Nákupný zoznam', padding, padding + 24);
		ctx.strokeStyle = '#3a3020';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(padding, padding + 40);
		ctx.lineTo(width - padding, padding + 40);
		ctx.stroke();

		let y = titleHeight + padding;
		ctx.font = '16px "IBM Plex Mono", ui-monospace, monospace';
		ctx.fillStyle = '#f3ede0';

		list.items.forEach((i) => {
			ctx.fillStyle = '#7f7261';
			ctx.fillText('☐', padding, y);
			ctx.fillStyle = '#f3ede0';
			ctx.fillText(i.name, padding + 22, y);
			ctx.fillStyle = '#c9a227';
			const amountText = formatShoppingAmount(i);
			const amountWidth = ctx.measureText(amountText).width;
			ctx.fillText(amountText, width - padding - amountWidth, y);
			y += lineHeight;
		});

		if (list.extras.length) {
			y += subheadGap - lineHeight;
			ctx.fillStyle = '#b6a494';
			ctx.fillText('Podľa chuti', padding, y);
			y += lineHeight;
			list.extras.forEach((e) => {
				ctx.fillStyle = '#7f7261';
				ctx.fillText('☐', padding, y);
				ctx.fillStyle = '#f3ede0';
				ctx.fillText(e.name, padding + 22, y);
				y += lineHeight;
			});
		}

		return canvas.toDataURL('image/png');
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

	// A recipe "fits" if, for every daily target the user has actually set,
	// one serving doesn't exceed it on its own. Targets left blank are
	// skipped rather than treated as zero.
	function fitsWithinTarget(recipe) {
		const targets = session?.settings?.targets;
		if (!targets) return true;
		const n = recipe.nutrition_per_serving;

		if (targets.kcal && n.kcal > targets.kcal) return false;
		if (targets.protein_g && n.protein_g > targets.protein_g) return false;
		if (targets.carbs_g && n.carbs_g > targets.carbs_g) return false;
		if (targets.fat_g && n.fat_g > targets.fat_g) return false;
		return true;
	}

	/* ---------------------------------------------------------
	   Data loading
	--------------------------------------------------------- */
	async function loadRecipes() {
		if (!session) {
			updateViewVisibility();
			return;
		}
		try {
			const data = await apiFetch('/recipes');
			if (!Array.isArray(data)) {
				throw new Error('Server vrátil neočakávanú odpoveď.');
			}
			recipes = data;
		} catch (err) {
			el.grid.innerHTML = `<p style="color:var(--text-faint);grid-column:1/-1;">Recepty sa nepodarilo načítať: ${err.message}</p>`;
			console.error(err);
			updateViewVisibility();
			return;
		}
		buildChips();
		render();
		updateViewVisibility();
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

		if (withinTargetOnly) {
			list = list.filter(fitsWithinTarget);
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
		const planned = isPlanned(r.id);

		return `
			<div class="recipe-card" data-id="${r.id}" tabindex="0" role="button" aria-label="Zobraziť recept: ${r.title}">
				<div class="recipe-card__top">
					<h2 class="recipe-card__title">${r.title}</h2>
					<div class="recipe-card__actions">
						<button class="plan-toggle-btn${planned ? ' plan-toggle-btn--active' : ''}" data-plan-id="${r.id}" aria-pressed="${planned}" aria-label="${planned ? 'Odobrať z plánu' : 'Pridať do plánu'}">
							${planned ? ICON_PLAN_CHECK : ICON_PLAN_ADD}
						</button>
						<button class="fav-btn" data-fav-id="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}">
							${fav ? ICON_STAR_FILLED : ICON_STAR_OUTLINE}
						</button>
					</div>
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
				if (
					e.target.closest('.fav-btn') ||
					e.target.closest('.plan-toggle-btn')
				)
					return;
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

		el.grid.querySelectorAll('.plan-toggle-btn').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				togglePlan(Number(btn.dataset.planId));
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
		const planned = isPlanned(r.id);

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
					<div class="recipe-card__actions recipe-card__actions--lg">
						<button class="plan-toggle-btn plan-toggle-btn--lg${planned ? ' plan-toggle-btn--active' : ''}" data-plan-id="${r.id}" aria-pressed="${planned}" aria-label="${planned ? 'Odobrať z plánu' : 'Pridať do plánu'}">
							${planned ? ICON_PLAN_CHECK : ICON_PLAN_ADD}
						</button>
						<button class="fav-btn fav-btn--lg" data-fav-id="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'}">
							${fav ? ICON_STAR_FILLED : ICON_STAR_OUTLINE}
						</button>
					</div>
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

		const planBtn = el.detailContent.querySelector('.plan-toggle-btn');
		if (planBtn) {
			planBtn.addEventListener('click', () =>
				togglePlan(Number(planBtn.dataset.planId)),
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

	/* ---------------------------------------------------------
	   Gate: recipes are only shown to a logged-in session
	--------------------------------------------------------- */
	function updateViewVisibility() {
		if (!session) {
			el.viewGate.hidden = false;
			el.viewList.hidden = true;
			el.viewDetail.hidden = true;
			document.title = 'Nutrikalkulačka od Hany';
			return;
		}
		el.viewGate.hidden = true;
		route();
	}

	el.backBtn.addEventListener('click', () => {
		window.location.hash = '#/';
	});

	el.gateLoginBtn.addEventListener('click', () => {
		el.accountSignedOutBtn.click();
	});

	window.addEventListener('hashchange', updateViewVisibility);

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

	el.withinTargetCheckbox.addEventListener('change', (e) => {
		withinTargetOnly = e.target.checked;
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

		if (session) {
			await loadRecipes();
		} else {
			updateViewVisibility();
		}
	}

	init();
})();
