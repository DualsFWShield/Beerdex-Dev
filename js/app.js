import { GUIDE_HTML } from './guide_content.js';
import { ARTICLES as LOCAL_ARTICLES } from './data.js';

const mainContent = document.getElementById('main-content');
let ALL_ARTICLES = [...LOCAL_ARTICLES];

// Init
function init() {
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
        // Firebase has been removed. Only use local articles.
        ALL_ARTICLES = [...LOCAL_ARTICLES];

        // Render Articles (Initial Load - All)
        renderArticles();

        // Initialize Interactive Elements
        setupSearch();
        setupRandom();
        setupQuiz();
        setupStyleMap();
    });
}

function renderArticles(filter = '') {
    const grid = document.getElementById('beer-type-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const term = filter.toLowerCase().trim();

    const filtered = ALL_ARTICLES.filter(art => {
        // Don't show Intro in the grid by default
        if (!term && art.id === 'intro') return false;

        const matchTitle = art.title ? art.title.toLowerCase().includes(term) : false;
        const matchTags = art.tags ? art.tags.some(t => t.toLowerCase().includes(term)) : false;
        const matchSummary = art.summary ? art.summary.toLowerCase().includes(term) : false;

        return matchTitle || matchTags || matchSummary;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#666;">
            <p>Aucun résultat pour "${filter}".</p>
            <p>Essayez "IPA", "Noire", "Légère"...</p>
        </div>`;
        return;
    }

    filtered.forEach(art => {
        const card = document.createElement('div');
        card.className = 'type-card';

        const tagsHtml = art.tags.map(t => `<span class="tag">${t}</span>`).join('');

        card.innerHTML = `
            <h3>${art.icon} ${art.title}</h3>
            <div class="tags">${tagsHtml}</div>
            <p>${art.summary}</p>
            <a href="${art.file}" class="btn-small-outline">En savoir plus</a>
            ${art.pairing ? `<p class="food-pairing">🍽️ Idéal avec : ${art.pairing}</p>` : ''}
        `;

        grid.appendChild(card);
    });
}

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

    const questions = [
        {
            id: 1,
            text: "C'est votre première fois ?",
            opts: [
                { text: "Oui, je débute", next: 2 },
                { text: "Non, je connais un peu", next: 3 }
            ]
        },
        {
            id: 2, // Beginner path
            text: "Vous préférez quoi comme goût ?",
            opts: [
                { text: "Léger et rafraîchissant", res: { title: "Lager / Pils", desc: "La valeur sûre. Fraîche, pétillante, sans prise de tête." } },
                { text: "Sucré et fruité", res: { title: "Blanche / Fruitée", desc: "Des notes d'agrumes ou de fruits rouges, peu d'amertume." } }
            ]
        },
        {
            id: 3, // Expert path
            text: "Votre position sur l'amertume ?",
            opts: [
                { text: "J'adore ça !", next: 4 },
                { text: "Pas trop mon truc", next: 5 }
            ]
        },
        {
            id: 4, // Bitter lover
            text: "Et la puissance ?",
            opts: [
                { text: "Plutôt léger (Session)", res: { title: "Session IPA", desc: "Tout le goût du houblon, mais léger en alcool." } },
                { text: "Fort et intense", res: { title: "Imperial IPA", desc: "Une explosion de saveurs et une bonne dose d'alcool." } }
            ]
        },
        {
            id: 5, // Malt lover
            text: "Café/Chocolat ou Caramel/Epices ?",
            opts: [
                { text: "Café / Noir", res: { title: "Stout / Porter", desc: "Des bières sombres, torréfiées, parfaites pour déguster." } },
                { text: "Caramel / Rondeur", res: { title: "Triple Belge", desc: "Ronde, chaleureuse, avec des notes de fruits mûrs." } }
            ]
        }
    ];

    const showQuestion = (id) => {
        const q = questions.find(x => x.id === id);
        if (!q) return;

        qText.innerText = q.text;
        qOpts.innerHTML = '';

        q.opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.style.margin = '5px';
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
    };

    const showResult = (res) => {
        qDiv.classList.add('hidden');
        resDiv.classList.remove('hidden');
        document.getElementById('res-title').innerText = res.title;
        document.getElementById('res-desc').innerText = res.desc;
    };

    const btnStart = document.getElementById('btn-quiz-start');
    const btnReset = document.getElementById('btn-quiz-reset');

    if (btnStart) btnStart.onclick = () => showQuestion(1);
    if (btnReset) btnReset.onclick = () => {
        resDiv.classList.add('hidden');
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
