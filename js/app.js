import { GUIDE_HTML } from './guide_content.js';
import { ARTICLES as LOCAL_ARTICLES } from './data.js';

const mainContent = document.getElementById('main-content');
let ALL_ARTICLES = [...LOCAL_ARTICLES]; // Only use local

// Init
function init() {
    // Check for first launch of Beerpedia
    if (!localStorage.getItem('beerpedia_intro_seen')) {
        localStorage.setItem('beerpedia_intro_seen', 'true');
        window.location.href = 'articles/intro.html';
        return;
    }

    renderGuide(mainContent);
}

// --- Dynamic Rendering ---

function renderGuide(container) {
    container.innerHTML = GUIDE_HTML;
    window.scrollTo(0, 0);

    // Wait for DOM to be ready before rendering articles
    requestAnimationFrame(() => {
        // Render Articles (Initial Load - All)
        renderArticles();

        // Initialize Interactive Elements
        setupSearch();
        setupRandom();
        setupQuiz();
        setupStyleMap();
    });
}

function getFavorites() {
    const favs = localStorage.getItem('beerpedia_favorites');
    return favs ? JSON.parse(favs) : [];
}

function toggleFavorite(id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem('beerpedia_favorites', JSON.stringify(favs));
    renderArticles(document.getElementById('beer-search')?.value || '');
}

function renderArticles(filter = '') {
    const grid = document.getElementById('beer-type-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const term = filter.toLowerCase().trim();
    const favorites = getFavorites();

    const filtered = ALL_ARTICLES.filter(art => {
        // Don't show Intro in the grid by default
        if (!term && art.id === 'intro') return false;

        const matchTitle = art.title ? art.title.toLowerCase().includes(term) : false;
        const matchTags = art.tags ? art.tags.some(t => t.toLowerCase().includes(term)) : false;
        const matchSummary = art.summary ? art.summary.toLowerCase().includes(term) : false;
        const matchFavorite = term === 'favoris' || term === 'favorites' ? favorites.includes(art.id) : false;

        return matchTitle || matchTags || matchSummary || matchFavorite;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#666; animation: fadeIn 0.5s ease-out;">
            <p style="font-size: 1.2rem; margin-bottom: 10px;">∅ Aucun résultat pour "${filter}"</p>
            <p>Essayez "IPA", "Noire", "Légère" ou "Favoris"...</p>
        </div>`;
        return;
    }

    filtered.forEach((art, index) => {
        const card = document.createElement('div');
        card.className = 'type-card';
        card.style.animationDelay = `${index * 0.1}s`;

        const isFav = favorites.includes(art.id);
        const tagsHtml = art.tags.map(t => `<span class="tag">${t}</span>`).join('');

        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.preventDefault(); window.toggleFavorite('${art.id}')" title="Ajouter aux favoris">
                ${isFav ? '★' : '☆'}
            </button>
            <h3>${art.icon} ${art.title}</h3>
            <div class="tags">${tagsHtml}</div>
            <p>${art.summary}</p>
            <div style="margin-bottom: 15px;">
                ${art.pairing ? `<p class="food-pairing" style="margin-bottom: 5px;">🍽️ <strong>Pairing:</strong> ${art.pairing}</p>` : ''}
                ${art.glass ? `<p style="font-size: 0.85rem; color: var(--text-secondary);">🍷 <strong>Verre:</strong> ${art.glass}</p>` : ''}
            </div>
            <a href="${art.file}" class="btn-small-outline">Déguster l'article</a>
        `;

        grid.appendChild(card);
    });
}

// Expose toggleFavorite to window for onclick
window.toggleFavorite = toggleFavorite;

// --- Interactions ---

function setupSearch() {
    const input = document.getElementById('beer-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
        renderArticles(e.target.value);
    });
}

function setupRandom() {
    const btn = document.getElementById('btn-random-article');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Pick random article
        const rand = ALL_ARTICLES[Math.floor(Math.random() * ALL_ARTICLES.length)];
        window.location.href = rand.file;
    });
}

// --- Legacy Interactions (Quiz, Map) ---

function setupQuiz() {
    const container = document.getElementById('quiz-container');
    if (!container) return;

    const startDiv = document.getElementById('quiz-start');
    const qDiv = document.getElementById('quiz-question');
    const resDiv = document.getElementById('quiz-result');
    const qText = document.getElementById('q-text');
    const qOpts = document.getElementById('q-options');

    // Add progress bar if not exists
    if (!document.querySelector('.quiz-progress-container')) {
        const progress = document.createElement('div');
        progress.className = 'quiz-progress-container hidden';
        progress.innerHTML = '<div class="quiz-progress-bar" id="quiz-progress"></div>';
        container.prepend(progress);
    }

    const progressContainer = document.querySelector('.quiz-progress-container');
    const progressBar = document.getElementById('quiz-progress');

    const questions = [
        {
            id: 1,
            text: "C'est votre première fois ?",
            opts: [
                { text: "🐣 Oui, je débute", next: 2 },
                { text: "🍺 Non, je connais un peu", next: 3 }
            ]
        },
        {
            id: 2, // Beginner path
            text: "Vous préférez quoi comme goût ?",
            opts: [
                { text: "🌊 Léger et rafraîchissant", res: { title: "Lager / Pils", desc: "La valeur sûre. Fraîche, pétillante, sans prise de tête." } },
                { text: "🍎 Sucré et fruité", res: { title: "Blanche / Fruitée", desc: "Des notes d'agrumes ou de fruits rouges, peu d'amertume." } }
            ]
        },
        {
            id: 3, // Expert path
            text: "Votre position sur l'amertume ?",
            opts: [
                { text: "🔥 J'adore ça !", next: 4 },
                { text: "🍃 Pas trop mon truc", next: 5 }
            ]
        },
        {
            id: 4, // Bitter lover
            text: "Et la puissance ?",
            opts: [
                { text: "🏸 Plutôt léger (Session)", res: { title: "Session IPA", desc: "Tout le goût du houblon, mais léger en alcool." } },
                { text: "🚀 Fort et intense", res: { title: "Imperial IPA", desc: "Une explosion de saveurs et une bonne dose d'alcool." } }
            ]
        },
        {
            id: 5, // Malt lover
            text: "Café/Chocolat ou Caramel/Epices ?",
            opts: [
                { text: "☕ Café / Noir", res: { title: "Stout / Porter", desc: "Des bières sombres, torréfiées, parfaites pour déguster." } },
                { text: "🍯 Caramel / Rondeur", res: { title: "Triple Belge", desc: "Ronde, chaleureuse, avec des notes de fruits mûrs." } }
            ]
        }
    ];

    let currentStep = 0;
    const totalSteps = 2; // Approximated for progress bar

    const showQuestion = (id) => {
        const q = questions.find(x => x.id === id);
        if (!q) return;

        currentStep++;
        const progress = (currentStep / (totalSteps + 1)) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;

        qText.innerText = q.text;
        qOpts.innerHTML = '';
        qDiv.style.animation = 'none';
        qDiv.offsetHeight; // Reset animation
        qDiv.style.animation = 'fadeIn 0.5s ease-out';

        q.opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.innerText = opt.text;
            btn.onclick = () => {
                if (opt.next) {
                    showQuestion(opt.next);
                } else if (opt.res) {
                    showResult(opt.res);
                }
            };
            qOpts.appendChild(btn);
        });

        startDiv.classList.add('hidden');
        qDiv.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
    };

    const showResult = (res) => {
        if (progressBar) progressBar.style.width = `100%`;
        qDiv.classList.add('hidden');
        resDiv.classList.remove('hidden');
        resDiv.style.animation = 'fadeIn 0.8s ease-out';
        document.getElementById('res-title').innerText = res.title;
        document.getElementById('res-desc').innerText = res.desc;
    };

    const btnStart = document.getElementById('btn-quiz-start');
    const btnReset = document.getElementById('btn-quiz-reset');

    if (btnStart) btnStart.onclick = () => {
        currentStep = 0;
        showQuestion(1);
    };
    if (btnReset) btnReset.onclick = () => {
        resDiv.classList.add('hidden');
        progressContainer.classList.add('hidden');
        startDiv.classList.remove('hidden');
    };
}

function setupStyleMap() {
    document.querySelectorAll('.beer-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('.beer-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            const label = dot.dataset.label;
            // Maybe filter the grid with this style?
            // renderArticles(label); 
            // ^ That would be cool UI interactivity!
            // Let's try it:
            const searchInput = document.getElementById('beer-search');
            if (searchInput) {
                searchInput.value = label;
                renderArticles(label);
                // Scroll to grid
                document.getElementById('beer-type-grid').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(`Style : ${label}`);
            }
        });
    });
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
