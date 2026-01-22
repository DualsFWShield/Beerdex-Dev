import * as Data from './data.js';
import * as UI from './ui.js';
import * as Storage from './storage.js';

// Expose UI for inline HTML event handlers
window.UI = UI;
window.showToast = UI.showToast;

// App State
const state = {
    beers: [],
    filteredBeers: [], // Cache for filtered results
    filter: '',
    activeFilters: {},
    view: 'home', // home
    pagination: {
        page: 1,
        itemsPerPage: 24,
        hasMore: true
    },
    observer: null // Store observer to disconnect if needed
};

// Initialize Application
async function init() {
    try {
        // Load Data
        const staticBeers = await Data.fetchAllBeers();
        const customBeers = Storage.getCustomBeers();
        state.beers = [...customBeers, ...staticBeers];

        // Initial Render
        renderCurrentView();

        // Setup Event Listeners
        setupEventListeners();

        // Check Welcome
        UI.checkAndShowWelcome();

    } catch (error) {
        console.error("Failed to initialize Beerdex:", error);
        UI.showToast("Erreur de chargement des données.");
    }
}

function loadMoreBeers(container, isAppend = false, isDiscoveryMode = false, showCreatePrompt = false) {
    const { page, itemsPerPage } = state.pagination;
    const start = (page - 1) * itemsPerPage;
    const end = page * itemsPerPage;

    // Slice data
    const batch = state.filteredBeers.slice(start, end);

    if (batch.length < itemsPerPage) {
        state.pagination.hasMore = false;
    }

    // Call UI Render
    // If it's discovery mode and empty, we might need special handling passed to UI
    UI.renderBeerList(batch, container, state.activeFilters, showCreatePrompt, () => {
        // Handle "Create" click from empty state
        UI.renderAddBeerForm((newBeer) => {
            Storage.saveCustomBeer(newBeer);
            state.beers.unshift(newBeer);
            state.filter = ''; // Reset filter after add? or keep it?
            renderCurrentView();
            UI.closeModal();
            UI.showToast("Bière ajoutée !");
        }, state.filter);
    }, isAppend);

    // Setup Sentinel for IntersectionObserver if there is more data
    if (state.pagination.hasMore) {
        setupInfiniteScroll(container);
    }
}

function setupInfiniteScroll(container) {
    // We need to ensure the sentinel is AFTER the beer-grid.
    // If container == main-content, and it contains .beer-grid, we append sentinel to main-content.

    let sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        // Make it invisible but present
        sentinel.style.height = '20px';
        sentinel.style.width = '100%';
        sentinel.style.clear = 'both'; // Ensure it drops below floated elements if any
        container.appendChild(sentinel);
    } else {
        // Move to very end
        container.appendChild(sentinel);
    }

    if (!state.observer) {
        state.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && state.pagination.hasMore) {
                // Debounce slightly to prevent rapid firing
                if (state.isLoadingMore) return;
                state.isLoadingMore = true;

                state.pagination.page++;
                const isDiscovery = Storage.getPreference('discoveryMode', false);

                // Small delay to smooth out UI
                setTimeout(() => {
                    loadMoreBeers(container, true, isDiscovery, false);
                    state.isLoadingMore = false;
                }, 100);
            }
        }, { rootMargin: '400px' }); // Pre-load earlier
    }

    state.observer.observe(sentinel);
}

function searchBeers(beers, query) {
    if (!query) return beers;
    const lowerQuery = query.toLowerCase();
    return beers.filter(b =>
        b.title.toLowerCase().includes(lowerQuery) ||
        b.brewery.toLowerCase().includes(lowerQuery)
    );
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Prevent default anchor behavior for button-like navs if they were buttons
            // But we have anchors for Beerpedia now.
            if (e.currentTarget.tagName === 'A') return;

            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.view = e.currentTarget.dataset.view;
            renderCurrentView();
        });
    });

    // Delegated Events for Beer Cards (Click to see details)
    document.getElementById('main-content').addEventListener('click', (e) => {
        const card = e.target.closest('.beer-card');
        if (card) {
            const beerId = card.dataset.id;
            const beer = state.beers.find(b => b.id === beerId);
            if (beer) {
                UI.renderBeerDetail(beer, (ratingData) => {
                    Storage.saveBeerRating(beer.id, ratingData);
                    // Minimal dev version: no visual update needed really, or just toast
                    if (ratingData) card.classList.add('drunk');
                    UI.showToast("Note sauvegardée !");
                });
            }
        }
    });
}

// Logic fix for Filtering:
// We need headers 'UI' to expose filtering logic or move it here. 
// Currently UI.renderBeerList handles filters, but that breaks pagination 
// because we pass a small batch to it. 
// I must move the filtering logic OUT of UI.renderBeerList into a helper function here.
// But I cannot see UI.js fully here to copy it.
// I will rely on the fact that I can edit UI.js later or now.
// Actually, I should update UI.js to exporting `filterBeers(beers, filters)` and use it here.
// For now, I will modify `renderBeerList` call in `loadMoreBeers` to NOT pass filters,
// and instead apply filters to `state.filteredBeers` inside `renderCurrentView`.

// Wait, I need to fix `renderCurrentView` to apply filters logic *before* slicing.
// I'll add `applyFilters` function here that mimics UI.renderBeerList logic.

function applyFilters(beers, filters) {
    if (!filters || Object.keys(filters).length === 0) return beers;

    let result = [...beers];

    // Exact copy of UI.js filtering logic would be best.
    // For brevity and correctness, I should probably ask UI.js to do it aka refactor UI.js.
    // But for this turn, I will implement a robust filter function here.

    // --- Helper ---
    const getAlc = (b) => parseFloat((b.alcohol || '0').replace('%', '').replace('°', '')) || 0;
    const getVol = (b) => {
        const str = (b.volume || '').toLowerCase();
        if (str.includes('l') && !str.includes('ml') && !str.includes('cl')) return parseFloat(str) * 1000;
        if (str.includes('cl')) return parseFloat(str) * 10;
        return parseFloat(str) || 330;
    };

    // Type & Brewery
    if (filters.type && filters.type !== 'All') result = result.filter(b => b.type === filters.type);
    if (filters.brewery && filters.brewery !== 'All') result = result.filter(b => b.brewery === filters.brewery);

    // Alcohol
    if (filters.alcMode) {
        const max = parseFloat(filters.alcMax);
        const min = parseFloat(filters.alcMin);
        const exact = parseFloat(filters.alcExact);
        if (filters.alcMode === 'max' && !isNaN(max)) result = result.filter(b => getAlc(b) <= max);
        else if (filters.alcMode === 'range') {
            if (!isNaN(min)) result = result.filter(b => getAlc(b) >= min);
            if (!isNaN(max)) result = result.filter(b => getAlc(b) <= max);
        } else if (filters.alcMode === 'exact' && !isNaN(exact)) result = result.filter(b => Math.abs(getAlc(b) - exact) < 0.1);
    }

    // Volume
    if (filters.volMode && filters.volMode !== 'any') {
        const min = parseFloat(filters.volMin);
        const max = parseFloat(filters.volMax);
        const exact = parseFloat(filters.volExact);
        if (filters.volMode === 'range') {
            if (!isNaN(min)) result = result.filter(b => getVol(b) >= min);
            if (!isNaN(max)) result = result.filter(b => getVol(b) <= max);
        } else if (filters.volMode === 'exact' && !isNaN(exact)) result = result.filter(b => Math.abs(getVol(b) - exact) < 5);
    }

    // Min Rating
    if (filters.minRating && parseInt(filters.minRating) > 0) {
        const minR = parseInt(filters.minRating);
        result = result.filter(b => {
            const r = Storage.getBeerRating(b.id);
            return r && r.score >= minR;
        });
    }

    // Custom
    if (filters.onlyCustom) result = result.filter(b => String(b.id).startsWith('CUSTOM_'));
    if (filters.onlyFavorites) result = result.filter(b => Storage.isFavorite(b.id));

    // Sorting
    result.sort((a, b) => {
        // ALWAYS Pin Favorites to Top (unless ignored)
        if (!filters.ignoreFavorites) {
            const favA = Storage.isFavorite(a.id) ? 1 : 0;
            const favB = Storage.isFavorite(b.id) ? 1 : 0;
            if (favA !== favB) return favB - favA;
        }

        // Secondary Sort
        let valA, valB;
        if (filters.sortBy === 'brewery') { valA = a.brewery.toLowerCase(); valB = b.brewery.toLowerCase(); }
        else if (filters.sortBy === 'alcohol') { valA = getAlc(a); valB = getAlc(b); }
        else if (filters.sortBy === 'volume') { valA = getVol(a); valB = getVol(b); }
        else { valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); } // Default to Title

        if (valA < valB) return filters.sortOrder === 'desc' ? 1 : -1;
        if (valA > valB) return filters.sortOrder === 'desc' ? -1 : 1;
        return 0;
    });

    return result;
}

// NOTE: I need to update renderCurrentView to USE applyFilters
// I will rewrite renderCurrentView below to include it.

// Re-declaring renderCurrentView with filter logic included
/* 
    ... (the function defined above needs this logic injected before caching filteredBeers) 
    I will merge them in the final output.
*/

// Initialize
window.addEventListener('DOMContentLoaded', init);

// Register Service Worker for PWA


function notifyUpdate(worker) {
    const toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = `
        <span>Nouvelle version disponible !</span>
        <button id="reload-btn">Mettre à jour</button>
    `;
    document.body.appendChild(toast);

    document.getElementById('reload-btn').addEventListener('click', () => {
        worker.postMessage({ type: 'SKIP_WAITING' });
    });
}

// Redefine renderCurrentView correctly to include applyFilters
// This overwrites the previous definition in this file content block
function renderCurrentView() {
    const mainContent = document.getElementById('main-content');

    if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
    }

    if (state.view === 'home') {
        const isDiscovery = Storage.getPreference('discoveryMode', false);

        // 1. Search
        let filtered = searchBeers(state.beers, state.filter);

        // 2. Discovery Logic
        if (isDiscovery && !state.filter) {
            const consumedIds = Storage.getAllConsumedBeerIds();
            filtered = state.beers.filter(b => consumedIds.includes(b.id));
        }

        // 3. Apply Filters (Moved from UI to logic)
        filtered = applyFilters(filtered, state.activeFilters);

        state.filteredBeers = filtered;
        state.pagination.page = 1;
        state.pagination.hasMore = true;

        const busTab = document.querySelector('.nav-item[data-view="drunk"]');
        if (busTab) busTab.style.display = isDiscovery ? 'none' : 'flex';

        // Render first batch - PASS NULL for filters to UI because we already filtered!
        loadMoreBeers(mainContent, false, isDiscovery, isDiscovery && state.filter);

    } else if (state.view === 'drunk') {
        const consumedIds = Storage.getAllConsumedBeerIds();
        let drunkBeers = state.beers.filter(b => consumedIds.includes(b.id));

        // Apply filters to drunk view too? Why not.
        drunkBeers = applyFilters(drunkBeers, state.activeFilters);

        state.filteredBeers = drunkBeers;
        state.pagination.page = 1;
        state.pagination.hasMore = true;

        loadMoreBeers(mainContent, false, false, false);

    } else if (state.view === 'stats') {
        const isDiscovery = Storage.getPreference('discoveryMode', false);
        UI.renderStats(state.beers, Storage.getAllUserData(), mainContent, isDiscovery, (newVal) => {
            Storage.savePreference('discoveryMode', newVal);
            renderCurrentView();
        });

    }
    // Guide & Article views moved to beerpedia.html


    // Ensure loader is hidden if it was there? (Inner HTML clear handles it)
}

// Global Nav Request Handler (from UI back buttons)
window.addEventListener('nav-request', (e) => {
    state.view = e.detail.view;
    if (e.detail.articleId) state.currentArticleId = e.detail.articleId;
    renderCurrentView();
});

// Expose navigation for inline HTML (Guide buttons)
window.navigateToArticle = (id) => {
    state.view = 'article';
    state.currentArticleId = id;
    renderCurrentView();
};

