(() => {
	'use strict';

	/* ---------------------------------------------------------
	   State
	--------------------------------------------------------- */
	let recipes = [];
	let activeChips = new Set();
	let searchTerm = '';
	let sortMode = 'default';

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
	};

	/* ---------------------------------------------------------
	   Icons (inline, reused)
	--------------------------------------------------------- */
	const ICON_CLOCK =
		'<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.4"/><path d="M10 6v4.2l2.8 1.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
	const ICON_SERVINGS =
		'<svg viewBox="0 0 20 20" fill="none"><path d="M6 3v6a1.5 1.5 0 0 0 3 0V3M7.5 9v8M14 3c-1.1 0-2 1.4-2 4s.9 4 2 4 2-1.4 2-4-.9-4-2-4Zm0 8v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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

	/* ---------------------------------------------------------
	   Data loading
	--------------------------------------------------------- */
	async function loadRecipes() {
		try {
			const res = await fetch('recipes.json');
			recipes = await res.json();
		} catch (err) {
			el.grid.innerHTML =
				'<p style="color:var(--text-faint);grid-column:1/-1;">Recepty sa nepodarilo načítať. Ak si túto stránku otvoril priamo zo súboru, skús ju spustiť cez lokálny server alebo GitHub Pages.</p>';
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
		ordered.forEach((m) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'chip';
			btn.setAttribute('aria-pressed', 'false');
			btn.textContent = `${titleCase(m)} (${counts[m]})`;
			btn.addEventListener('click', () => {
				if (activeChips.has(m)) {
					activeChips.delete(m);
					btn.setAttribute('aria-pressed', 'false');
				} else {
					activeChips.add(m);
					btn.setAttribute('aria-pressed', 'true');
				}
				render();
			});
			el.chipRow.appendChild(btn);
		});
	}

	/* ---------------------------------------------------------
	   Filtering + sorting
	--------------------------------------------------------- */
	function getFiltered() {
		let list = recipes;

		if (activeChips.size > 0) {
			list = list.filter((r) => r.meal_type.some((m) => activeChips.has(m)));
		}

		if (searchTerm.trim()) {
			const term = searchTerm.trim().toLowerCase();
			list = list.filter((r) => {
				if (r.title.toLowerCase().includes(term)) return true;
				return r.ingredients.some((i) => i.name.toLowerCase().includes(term));
			});
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

		return `
			<button class="recipe-card" data-id="${r.id}" aria-label="Zobraziť recept: ${r.title}">
				<h2 class="recipe-card__title">${r.title}</h2>
				<div class="recipe-card__tags">${tags}</div>
				<div class="nlabel">
					<div class="nlabel__headline">
						<div>
							<span class="nlabel__kcal">${n.kcal}</span>
							<div class="nlabel__kcal-unit">kcal</div>
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
					<span>${ICON_SERVINGS} ${r.servings} ${r.servings === 1 ? 'porcia' : r.servings < 5 ? 'porcie' : 'porcií'}</span>
				</div>
			</button>
		`;
	}

	function render() {
		const list = getFiltered();
		el.resultCount.textContent = `Zobrazených ${list.length} z ${recipes.length} receptov`;
		el.emptyState.hidden = list.length !== 0;
		el.grid.innerHTML = list.map(cardTemplate).join('');

		el.grid.querySelectorAll('.recipe-card').forEach((card) => {
			card.addEventListener('click', () => {
				window.location.hash = `#/recipe/${card.dataset.id}`;
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
				<h1 class="detail-header__title">${r.title}</h1>
				<div class="detail-header__tags">${tags}</div>
				<div class="detail-header__meta">
					${r.time_minutes ? `<span>${ICON_CLOCK} ${r.time_minutes} min</span>` : ''}
					<span>${ICON_SERVINGS} ${r.servings} ${r.servings === 1 ? 'porcia' : r.servings < 5 ? 'porcie' : 'porcií'}</span>
				</div>
			</div>

			<div class="detail-grid">
				<aside class="facts">
					<p class="facts__eyebrow">Nutričné hodnoty</p>
					<p class="facts__serving">Na 1 porciu (recept má ${r.servings} ${
						r.servings === 1 ? 'porciu' : r.servings < 5 ? 'porcie' : 'porcií'
					})</p>
					<div class="facts__kcal-row">
						<span class="facts__kcal-label">Kalórie</span>
						<span class="facts__kcal-value">${n.kcal}</span>
					</div>
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
		document.title = `${recipe.title} — NutriCalc`;
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
			document.title = 'NutriCalc — Recepty';
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

	/* ---------------------------------------------------------
	   Init
	--------------------------------------------------------- */
	loadRecipes();
})();
