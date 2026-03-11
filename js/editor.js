// ======================================
// BEERPEDIA WYSIWYG EDITOR - v4.0
// Block-based + WYSIWYG Hybrid
// ======================================

// ─── DOM ─────────────────────────
const editorContent = document.getElementById('editor-content');
const titleInput = document.getElementById('meta-title');
const subtitleInput = document.getElementById('meta-subtitle');
const iconSelect = document.getElementById('meta-icon');
const authorInput = document.getElementById('meta-author');
const roleInput = document.getElementById('meta-role');
const wordCountEl = document.getElementById('word-count');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const blockPanel = document.getElementById('block-panel');

// ─── State ──────────────────────
const STORAGE_KEY = 'beerpedia_editor_data';
let currentDraftId = null;
let saveTimeout = null;
let slashMenuRef = null;
let slashRange = null;
let editingBlockEl = null;

// ═══════════════════════════════════════
//           BLOCK PANEL
// ═══════════════════════════════════════

document.getElementById('btn-toggle-panel').addEventListener('click', () => {
    blockPanel.classList.toggle('collapsed');
});
document.getElementById('btn-close-panel').addEventListener('click', () => {
    blockPanel.classList.add('collapsed');
});

// Click to insert from panel
document.querySelectorAll('.block-panel-item').forEach(item => {
    item.addEventListener('click', () => {
        const type = item.dataset.insert;
        insertBlockByType(type);
        editorContent.focus();
    });

    // Drag from panel
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.insert);
        e.dataTransfer.effectAllowed = 'copy';
    });
});

// Drop on canvas
editorContent.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
editorContent.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (type) {
        insertBlockByType(type);
        scheduleSave();
    }
});

// ═══════════════════════════════════════
//         BLOCK INSERTION LOGIC
// ═══════════════════════════════════════

function insertBlockByType(type) {
    switch (type) {
        case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
        case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
        case 'text': document.execCommand('formatBlock', false, '<p>'); break;
        case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
        case 'ul': document.execCommand('insertUnorderedList'); break;
        case 'image': promptInsertImage(); break;
        case 'divider': insertHTML('<hr><p><br></p>'); break;
        case 'signature': promptSignature(); break;
        case 'meta': promptMeta(); break;
        case 'faq': promptFAQ(); break;
        case 'table': promptTable(); break;
        case 'callout': promptCallout(); break;
        case 'accordion': promptAccordion(); break;
        case 'carousel': promptCarousel(); break;
        case 'quiz': promptQuiz(); break;
        case 'stats': promptStats(); break;
        case 'code': promptCode(); break;
        case 'gallery': promptGallery(); break;
        case 'video': promptVideo(); break;
        case 'columns': promptColumns(); break;
        default: break;
    }
    scheduleSave();
}

function insertHTML(html) {
    editorContent.focus();
    document.execCommand('insertHTML', false, html);
}

function esc(s) {
    return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
    return (s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function blockWrap(type, attrs, inner) {
    const attrStr = Object.entries(attrs).map(([k,v]) => `data-${k}="${escAttr(v)}"`).join(' ');
    return `<div class="editor-block" contenteditable="false" data-type="${type}" ${attrStr}><div class="block-controls"><button class="block-ctrl-btn" onclick="editBlock(this.closest('.editor-block'))">✏️</button><button class="block-ctrl-btn danger" onclick="deleteBlock(this.closest('.editor-block'))">✕</button></div>${inner}</div><p><br></p>`;
}

// ═══════════════════════════════════════
//     GENERIC INSERT MODAL SYSTEM
// ═══════════════════════════════════════

let insertModalCallback = null;

/**
 * Opens a styled modal with dynamic form fields.
 * @param {Object} config - { title, icon, fields, onSubmit }
 *   fields: Array of { id, label, type, value, placeholder, options, rows }
 *     type: 'text' | 'textarea' | 'number' | 'select' | 'repeater'
 *     options: for select → [{value, label}]
 *     repeater: { fields: [...], min, max, addLabel }
 */
function openInsertModal(config) {
    const modal = document.getElementById('insert-modal');
    const titleEl = document.getElementById('insert-modal-title');
    const fieldsEl = document.getElementById('insert-modal-fields');

    titleEl.textContent = `${config.icon || '📦'} ${config.title}`;
    fieldsEl.innerHTML = '';

    config.fields.forEach(f => {
        if (f.type === 'repeater') {
            const rDiv = document.createElement('div');
            rDiv.className = 'repeater-group';
            rDiv.dataset.id = f.id;
            rDiv.dataset.min = f.min || 1;
            rDiv.dataset.max = f.max || 10;
            rDiv.innerHTML = `<div class="repeater-header"><label>${f.label}</label><button type="button" class="btn-repeater-add toolbar-btn-ghost" data-repeater="${f.id}">${f.addLabel || '+ Ajouter'}</button></div><div class="repeater-items" id="repeater-${f.id}"></div>`;
            fieldsEl.appendChild(rDiv);
            // Add initial items
            const count = f.initialCount || f.min || 1;
            for (let i = 0; i < count; i++) addRepeaterItem(f.id, f.subFields, i + 1);
            // Bind add button
            rDiv.querySelector('.btn-repeater-add').addEventListener('click', () => {
                const items = rDiv.querySelectorAll('.repeater-item');
                if (items.length < (f.max || 10)) addRepeaterItem(f.id, f.subFields, items.length + 1);
            });
        } else {
            fieldsEl.appendChild(buildField(f));
        }
    });

    insertModalCallback = config.onSubmit;
    modal.classList.remove('hidden');

    // Focus first input
    setTimeout(() => { const first = fieldsEl.querySelector('input, textarea, select'); if (first) first.focus(); }, 100);
}

function buildField(f) {
    const d = document.createElement('div');
    d.className = 'edit-field';
    let html = `<label>${f.label}</label>`;
    switch (f.type) {
        case 'textarea':
            html += `<textarea id="${f.id}" rows="${f.rows || 3}" placeholder="${escAttr(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
            break;
        case 'number':
            html += `<input type="number" id="${f.id}" value="${escAttr(f.value || '')}" min="${f.min||1}" max="${f.max||99}" placeholder="${escAttr(f.placeholder || '')}">`;
            break;
        case 'select':
            html += `<select id="${f.id}">${(f.options||[]).map(o => `<option value="${escAttr(o.value)}" ${o.value===f.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
            break;
        default: // text
            html += `<input type="text" id="${f.id}" value="${escAttr(f.value || '')}" placeholder="${escAttr(f.placeholder || '')}">`;
    }
    d.innerHTML = html;
    return d;
}

function addRepeaterItem(groupId, subFields, index) {
    const container = document.getElementById(`repeater-${groupId}`);
    const item = document.createElement('div');
    item.className = 'repeater-item';
    item.innerHTML = `<div class="repeater-item-header"><span class="repeater-item-label">#${index}</span><button type="button" class="btn-repeater-remove btn-close" title="Supprimer">✕</button></div><div class="repeater-item-fields"></div>`;
    const fieldsWrap = item.querySelector('.repeater-item-fields');
    subFields.forEach(sf => {
        const field = buildField({ ...sf, id: `${groupId}_${index}_${sf.id}` });
        fieldsWrap.appendChild(field);
    });
    item.querySelector('.btn-repeater-remove').addEventListener('click', () => {
        item.remove();
        // Re-index labels
        container.querySelectorAll('.repeater-item-label').forEach((l, i) => l.textContent = `#${i+1}`);
    });
    container.appendChild(item);
}

function getInsertModalValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function getRepeaterValues(groupId) {
    const container = document.getElementById(`repeater-${groupId}`);
    if (!container) return [];
    const items = container.querySelectorAll('.repeater-item');
    return Array.from(items).map((item, i) => {
        const vals = {};
        item.querySelectorAll('input, textarea, select').forEach(el => {
            const key = el.id.replace(`${groupId}_${i+1}_`, '');
            vals[key] = el.value;
        });
        return vals;
    });
}

function closeInsertModal() {
    document.getElementById('insert-modal').classList.add('hidden');
    insertModalCallback = null;
}

function submitInsertModal() {
    if (insertModalCallback) insertModalCallback();
    closeInsertModal();
    editorContent.focus();
    scheduleSave();
}

// ═══════════════════════════════════════
//       BLOCK INSERT FUNCTIONS
//       (now using modal system)
// ═══════════════════════════════════════

function promptInsertImage() {
    openInsertModal({
        title: 'Insérer une Image', icon: '🖼️',
        fields: [
            { id: 'im-src', label: 'URL de l\'image', type: 'text', value: 'images/', placeholder: 'images/photo.jpg' },
            { id: 'im-alt', label: 'Texte alternatif', type: 'text', value: '', placeholder: 'Description de l\'image' },
        ],
        onSubmit: () => {
            const src = getInsertModalValue('im-src');
            const alt = getInsertModalValue('im-alt') || 'Image';
            if (src) insertHTML(`<div style="text-align:center;margin:16px 0;"><img src="${esc(src)}" alt="${esc(alt)}" style="max-width:100%;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4);"></div><p><br></p>`);
        }
    });
}

function promptSignature() {
    openInsertModal({
        title: 'Fiche Technique', icon: '🏷️',
        fields: [
            { id: 'sig-vol', label: 'Volume', type: 'text', value: '33cl', placeholder: '33cl, 75cl…' },
            { id: 'sig-abv', label: 'Alcool', type: 'text', value: '5.0%', placeholder: '5.0%' },
            { id: 'sig-style', label: 'Style', type: 'text', value: 'Lager', placeholder: 'Lager, IPA, Stout…' },
        ],
        onSubmit: () => {
            const vol = getInsertModalValue('sig-vol') || '33cl';
            const abv = getInsertModalValue('sig-abv') || '5.0%';
            const style = getInsertModalValue('sig-style') || 'Lager';
            insertHTML(blockWrap('signature', {vol, abv, style}, `
                <div class="editor-block-signature">
                    <div class="sig-item"><div class="label">Volume</div><div class="value">${esc(vol)}</div></div>
                    <div class="sig-divider"></div>
                    <div class="sig-item"><div class="label">Alcool</div><div class="value highlight">${esc(abv)}</div></div>
                    <div class="sig-divider"></div>
                    <div class="sig-item"><div class="label">Style</div><div class="value">${esc(style)}</div></div>
                </div>`));
        }
    });
}

function promptMeta() {
    openInsertModal({
        title: 'Infos Bière', icon: '🌡️',
        fields: [
            { id: 'mt-temp', label: 'Température', type: 'text', value: '6-8°C', placeholder: '6-8°C' },
            { id: 'mt-glass', label: 'Verre', type: 'text', value: 'Tulipe', placeholder: 'Tulipe, Pinte…' },
        ],
        onSubmit: () => {
            const temp = getInsertModalValue('mt-temp') || '6-8°C';
            const glass = getInsertModalValue('mt-glass') || 'Tulipe';
            insertHTML(blockWrap('meta', {temp, glass}, `
                <div class="editor-block-meta">
                    <span>🌡️ ${esc(temp)}</span>
                    <span>🍺 ${esc(glass)}</span>
                </div>`));
        }
    });
}

function promptFAQ() {
    openInsertModal({
        title: 'FAQ', icon: '❓',
        fields: [
            { id: 'faq-q', label: 'Question', type: 'text', value: '', placeholder: 'Quelle bière choisir ?' },
            { id: 'faq-a', label: 'Réponse', type: 'textarea', value: '', placeholder: 'Ça dépend du goût !', rows: 3 },
        ],
        onSubmit: () => {
            const q = getInsertModalValue('faq-q') || 'Question ?';
            const a = getInsertModalValue('faq-a') || 'Réponse…';
            insertHTML(blockWrap('faq', {question: q, answer: a}, `
                <div class="editor-block-faq">
                    <div class="faq-q">❓ ${esc(q)}</div>
                    <div class="faq-a">${esc(a)}</div>
                </div>`));
        }
    });
}

function promptTable() {
    openInsertModal({
        title: 'Tableau', icon: '▦',
        fields: [
            { id: 'tbl-cols', label: 'Colonnes', type: 'number', value: '3', min: 1, max: 10 },
            { id: 'tbl-rows', label: 'Lignes (hors en-tête)', type: 'number', value: '2', min: 1, max: 50 },
        ],
        onSubmit: () => {
            const cols = parseInt(getInsertModalValue('tbl-cols')) || 3;
            const rows = parseInt(getInsertModalValue('tbl-rows')) || 2;
            let t = '<table style="width:100%;border-collapse:collapse;background:var(--editor-surface);border-radius:8px;overflow:hidden;margin:16px 0;"><tr>';
            for (let c = 0; c < cols; c++) t += `<th style="background:var(--editor-surface-2,#1a1a1a);color:var(--accent-gold,#FFC000);padding:10px 12px;text-align:left;border:1px solid rgba(255,255,255,0.07);" contenteditable="true">En-tête ${c+1}</th>`;
            t += '</tr>';
            for (let r = 0; r < rows; r++) { t += '<tr>'; for (let c = 0; c < cols; c++) t += `<td style="padding:10px 12px;border:1px solid rgba(255,255,255,0.07);color:#ccc;" contenteditable="true">—</td>`; t += '</tr>'; }
            t += '</table><p><br></p>';
            insertHTML(t);
        }
    });
}

function promptCallout() {
    openInsertModal({
        title: 'Note / Alerte', icon: '💡',
        fields: [
            { id: 'co-type', label: 'Type', type: 'select', value: 'info', options: [
                { value: 'info', label: 'ℹ️ Information' },
                { value: 'warning', label: '⚠️ Avertissement' },
                { value: 'success', label: '✅ Succès' },
                { value: 'danger', label: '🚨 Danger' },
            ]},
            { id: 'co-msg', label: 'Message', type: 'textarea', value: '', placeholder: 'Information importante…', rows: 3 },
        ],
        onSubmit: () => {
            const icons = {info: 'ℹ️', warning: '⚠️', success: '✅', danger: '🚨'};
            const ctype = getInsertModalValue('co-type') || 'info';
            const msg = getInsertModalValue('co-msg') || 'Information…';
            insertHTML(blockWrap('callout', {ctype, msg}, `
                <div class="editor-block-callout callout-${ctype}">
                    <span class="callout-icon">${icons[ctype]}</span>
                    <span>${esc(msg)}</span>
                </div>`));
        }
    });
}

function promptAccordion() {
    openInsertModal({
        title: 'Accordéon', icon: '📂',
        fields: [
            { id: 'acc', label: 'Sections', type: 'repeater', initialCount: 3, min: 1, max: 10, addLabel: '+ Section',
              subFields: [
                { id: 'title', label: 'Titre', type: 'text', value: '', placeholder: 'Titre de la section' },
                { id: 'body', label: 'Contenu', type: 'textarea', value: '', placeholder: 'Contenu…', rows: 2 },
              ]
            }
        ],
        onSubmit: () => {
            const items = getRepeaterValues('acc').map((v, i) => ({
                title: v.title || `Section ${i+1}`,
                body: v.body || 'Contenu…'
            }));
            if (items.length === 0) items.push({ title: 'Section 1', body: 'Contenu…' });
            const inner = `<div class="editor-block-accordion">${items.map((it, i) => `
                <div class="accordion-item${i===0?' open':''}">
                    <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
                        <span>${esc(it.title)}</span><span class="arrow">▸</span>
                    </div>
                    <div class="accordion-body">${esc(it.body)}</div>
                </div>`).join('')}</div>`;
            insertHTML(blockWrap('accordion', {items: escAttr(JSON.stringify(items))}, inner));
        }
    });
}

function promptCarousel() {
    openInsertModal({
        title: 'Carousel', icon: '🎠',
        fields: [
            { id: 'car', label: 'Slides', type: 'repeater', initialCount: 3, min: 1, max: 10, addLabel: '+ Slide',
              subFields: [
                { id: 'url', label: 'URL Image', type: 'text', value: 'images/default.png', placeholder: 'images/photo.jpg' },
                { id: 'cap', label: 'Légende (optionnel)', type: 'text', value: '', placeholder: 'Légende…' },
              ]
            }
        ],
        onSubmit: () => {
            const slides = getRepeaterValues('car').map(v => ({
                url: v.url || 'images/default.png',
                cap: v.cap || ''
            }));
            if (slides.length === 0) slides.push({ url: 'images/default.png', cap: '' });
            const inner = `
                <div class="editor-block-carousel" data-slide="0">
                    <div class="carousel-viewport"><div class="carousel-track">${slides.map(s => `
                        <div class="carousel-slide">
                            <img src="${esc(s.url)}" alt="Slide">
                            ${s.cap ? `<div class="slide-caption">${esc(s.cap)}</div>` : ''}
                        </div>`).join('')}
                    </div></div>
                    <div class="carousel-nav">
                        <button onclick="carouselNav(this,-1)">◀</button>
                        <div class="carousel-dots">${slides.map((_, i) => `<div class="carousel-dot${i===0?' active':''}"></div>`).join('')}</div>
                        <button onclick="carouselNav(this,1)">▶</button>
                    </div>
                </div>`;
            insertHTML(blockWrap('carousel', {slides: escAttr(JSON.stringify(slides))}, inner));
        }
    });
}

function promptQuiz() {
    openInsertModal({
        title: 'Quiz', icon: '🎮',
        fields: [
            { id: 'qz-q', label: 'Question', type: 'text', value: '', placeholder: 'Quelle bière est la plus amère ?' },
            { id: 'qz-opts', label: 'Options (séparées par des virgules)', type: 'text', value: 'IPA, Pilsner, Stout, Blanche', placeholder: 'Option 1, Option 2, …' },
            { id: 'qz-correct', label: 'Réponse correcte (n°)', type: 'number', value: '1', min: 1, max: 20 },
        ],
        onSubmit: () => {
            const q = getInsertModalValue('qz-q') || 'Question ?';
            const opts = getInsertModalValue('qz-opts') || 'A, B, C';
            const correct = getInsertModalValue('qz-correct') || '1';
            const optArr = opts.split(',').map(o => o.trim()).filter(o => o);
            const inner = `
                <div class="editor-block-quiz">
                    <div class="quiz-header">🎮 Quiz</div>
                    <div class="quiz-body">
                        <div class="quiz-question">${esc(q)}</div>
                        <div class="quiz-options">${optArr.map((o, i) => `<div class="quiz-option" onclick="quizAnswer(this,${i+1},${parseInt(correct)})">${esc(o)}</div>`).join('')}</div>
                    </div>
                </div>`;
            insertHTML(blockWrap('quiz', {question: q, options: escAttr(JSON.stringify(optArr)), correct}, inner));
        }
    });
}

function promptStats() {
    openInsertModal({
        title: 'Statistiques', icon: '📊',
        fields: [
            { id: 'sta', label: 'Compteurs', type: 'repeater', initialCount: 3, min: 1, max: 8, addLabel: '+ Stat',
              subFields: [
                { id: 'val', label: 'Valeur', type: 'text', value: '42', placeholder: '42, 99%, +500…' },
                { id: 'label', label: 'Label', type: 'text', value: 'Stat', placeholder: 'Brasseries, Styles…' },
              ]
            }
        ],
        onSubmit: () => {
            const stats = getRepeaterValues('sta').map(v => ({
                val: v.val || '—',
                label: v.label || 'Stat'
            }));
            if (stats.length === 0) stats.push({ val: '—', label: 'Stat' });
            const inner = `<div class="editor-block-stats">${stats.map(s => `
                <div class="stat-card">
                    <div class="stat-value">${esc(s.val)}</div>
                    <div class="stat-label">${esc(s.label)}</div>
                </div>`).join('')}</div>`;
            insertHTML(blockWrap('stats', {stats: escAttr(JSON.stringify(stats))}, inner));
        }
    });
}

function promptCode() {
    openInsertModal({
        title: 'Bloc de Code', icon: '{ }',
        fields: [
            { id: 'cd-lang', label: 'Langage', type: 'text', value: 'javascript', placeholder: 'javascript, python, html…' },
            { id: 'cd-code', label: 'Code', type: 'textarea', value: 'console.log("Santé !");', placeholder: '// votre code ici', rows: 6 },
        ],
        onSubmit: () => {
            const lang = getInsertModalValue('cd-lang') || 'code';
            const code = getInsertModalValue('cd-code') || '// code';
            insertHTML(blockWrap('code', {lang, code: escAttr(code)}, `
                <div class="editor-block-code">
                    <div class="code-header"><span>${esc(lang)}</span></div>
                    <div class="code-body">${esc(code)}</div>
                </div>`));
        }
    });
}

function promptGallery() {
    openInsertModal({
        title: 'Galerie', icon: '🏞️',
        fields: [
            { id: 'gal', label: 'Images', type: 'repeater', initialCount: 4, min: 1, max: 12, addLabel: '+ Image',
              subFields: [
                { id: 'url', label: 'URL Image', type: 'text', value: 'images/default.png', placeholder: 'images/photo.jpg' },
              ]
            }
        ],
        onSubmit: () => {
            const imgs = getRepeaterValues('gal').map(v => v.url || 'images/default.png');
            const inner = `<div class="editor-block-gallery">${imgs.map(u => `<div class="gallery-item"><img src="${esc(u)}" alt="Gallery"></div>`).join('')}</div>`;
            insertHTML(blockWrap('gallery', {images: escAttr(JSON.stringify(imgs))}, inner));
        }
    });
}

function promptVideo() {
    openInsertModal({
        title: 'Vidéo', icon: '▶️',
        fields: [
            { id: 'vid-url', label: 'URL de la vidéo', type: 'text', value: '', placeholder: 'https://youtube.com/embed/… ou fichier local' },
        ],
        onSubmit: () => {
            const url = getInsertModalValue('vid-url');
            if (!url) return;
            const inner = url.includes('youtube') || url.includes('youtu.be')
                ? `<div class="editor-block-video"><iframe width="100%" height="300" src="${esc(url)}" frameborder="0" allowfullscreen style="border-radius:var(--radius-lg);"></iframe></div>`
                : `<div class="editor-block-video"><video controls style="width:100%;border-radius:var(--radius-lg);"><source src="${esc(url)}"></video></div>`;
            insertHTML(blockWrap('video', {url}, inner));
        }
    });
}

function promptColumns() {
    openInsertModal({
        title: 'Colonnes', icon: '▐▐',
        fields: [
            { id: 'col-n', label: 'Nombre de colonnes', type: 'select', value: '2', options: [
                { value: '2', label: '2 Colonnes' },
                { value: '3', label: '3 Colonnes' },
            ]},
            { id: 'col', label: 'Contenus', type: 'repeater', initialCount: 2, min: 2, max: 3, addLabel: '+ Colonne',
              subFields: [
                { id: 'text', label: 'Contenu', type: 'textarea', value: 'Texte…', placeholder: 'Contenu de la colonne', rows: 2 },
              ]
            }
        ],
        onSubmit: () => {
            const n = parseInt(getInsertModalValue('col-n')) || 2;
            const cls = n >= 3 ? 'cols-3' : 'cols-2';
            const cols = getRepeaterValues('col').map(v => v.text || 'Texte…');
            while (cols.length < n) cols.push('Texte…');
            const inner = `<div class="editor-block-columns ${cls}">${cols.slice(0, n).map(c => `<div class="column-item">${esc(c)}</div>`).join('')}</div>`;
            insertHTML(blockWrap('columns', {cols: escAttr(JSON.stringify(cols)), layout: cls}, inner));
        }
    });
}

// ═══════════════════════════════════════
//       INTERACTIVE BLOCK RUNTIME
// ═══════════════════════════════════════

window.carouselNav = (btn, dir) => {
    const carousel = btn.closest('.editor-block-carousel');
    if (!carousel) return;
    const track = carousel.querySelector('.carousel-track');
    const slides = track.querySelectorAll('.carousel-slide');
    let idx = parseInt(carousel.dataset.slide || '0') + dir;
    if (idx < 0) idx = slides.length - 1;
    if (idx >= slides.length) idx = 0;
    carousel.dataset.slide = idx;
    track.style.transform = `translateX(-${idx * 100}%)`;
    carousel.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
};

window.quizAnswer = (el, chosen, correct) => {
    const opts = el.parentElement.querySelectorAll('.quiz-option');
    opts.forEach((o, i) => {
        o.style.pointerEvents = 'none';
        if (i + 1 === correct) { o.style.borderColor = '#2ed573'; o.style.background = 'rgba(46,213,115,0.1)'; o.style.color = '#2ed573'; }
        else if (i + 1 === chosen && chosen !== correct) { o.style.borderColor = '#ff4757'; o.style.background = 'rgba(255,71,87,0.1)'; o.style.color = '#ff4757'; }
    });
};

// ═══════════════════════════════════════
//         BLOCK EDIT / DELETE
// ═══════════════════════════════════════

window.editBlock = (el) => {
    if (!el) return;
    editingBlockEl = el;
    const type = el.dataset.type;
    const modal = document.getElementById('block-edit-modal');
    const title = document.getElementById('block-edit-title');
    const fields = document.getElementById('block-edit-fields');
    fields.innerHTML = '';

    const makeField = (label, id, val, tag = 'input') => {
        const d = document.createElement('div');
        d.className = 'edit-field';
        d.innerHTML = `<label>${label}</label><${tag} id="${id}" ${tag==='textarea'?'rows="3"':'type="text"'} value="${escAttr(val)}">${tag==='textarea' ? esc(val) + '</textarea>' : ''}`;
        fields.appendChild(d);
    };

    switch (type) {
        case 'signature':
            title.textContent = '🏷️ Fiche Technique';
            makeField('Volume', 'edit-vol', el.dataset.vol);
            makeField('Alcool', 'edit-abv', el.dataset.abv);
            makeField('Style', 'edit-style', el.dataset.style);
            break;
        case 'meta':
            title.textContent = '🌡️ Infos';
            makeField('Température', 'edit-temp', el.dataset.temp);
            makeField('Verre', 'edit-glass', el.dataset.glass);
            break;
        case 'faq':
            title.textContent = '❓ FAQ';
            makeField('Question', 'edit-question', el.dataset.question);
            makeField('Réponse', 'edit-answer', el.dataset.answer, 'textarea');
            break;
        case 'callout':
            title.textContent = '💡 Note';
            makeField('Message', 'edit-msg', el.dataset.msg, 'textarea');
            break;
        case 'code':
            title.textContent = '{ } Code';
            makeField('Langage', 'edit-lang', el.dataset.lang);
            makeField('Code', 'edit-code', el.dataset.code, 'textarea');
            break;
        case 'video':
            title.textContent = '▶️ Vidéo';
            makeField('URL', 'edit-url', el.dataset.url);
            break;
        default:
            title.textContent = 'Modifier';
            const pre = document.createElement('p');
            pre.style.color = '#888';
            pre.textContent = 'Ce bloc peut être modifié directement dans l\'éditeur.';
            fields.appendChild(pre);
    }

    modal.classList.remove('hidden');
};

window.deleteBlock = (el) => {
    if (el && confirm('Supprimer ce bloc ?')) {
        el.remove();
        scheduleSave();
    }
};

document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    document.getElementById('block-edit-modal').classList.add('hidden');
    editingBlockEl = null;
});

document.getElementById('btn-save-edit').addEventListener('click', () => {
    if (!editingBlockEl) return;
    const type = editingBlockEl.dataset.type;

    switch (type) {
        case 'signature': {
            const vol = document.getElementById('edit-vol').value;
            const abv = document.getElementById('edit-abv').value;
            const style = document.getElementById('edit-style').value;
            editingBlockEl.dataset.vol = vol; editingBlockEl.dataset.abv = abv; editingBlockEl.dataset.style = style;
            const sig = editingBlockEl.querySelector('.editor-block-signature');
            if (sig) {
                const vals = sig.querySelectorAll('.value');
                if (vals[0]) vals[0].textContent = vol;
                if (vals[1]) vals[1].textContent = abv;
                if (vals[2]) vals[2].textContent = style;
            }
            break;
        }
        case 'meta': {
            const temp = document.getElementById('edit-temp').value;
            const glass = document.getElementById('edit-glass').value;
            editingBlockEl.dataset.temp = temp; editingBlockEl.dataset.glass = glass;
            const spans = editingBlockEl.querySelectorAll('.editor-block-meta span');
            if (spans[0]) spans[0].textContent = '🌡️ ' + temp;
            if (spans[1]) spans[1].textContent = '🍺 ' + glass;
            break;
        }
        case 'faq': {
            const q = document.getElementById('edit-question').value;
            const a = document.getElementById('edit-answer').value;
            editingBlockEl.dataset.question = q; editingBlockEl.dataset.answer = a;
            const fq = editingBlockEl.querySelector('.faq-q');
            const fa = editingBlockEl.querySelector('.faq-a');
            if (fq) fq.textContent = '❓ ' + q;
            if (fa) fa.textContent = a;
            break;
        }
        case 'callout': {
            const msg = document.getElementById('edit-msg').value;
            editingBlockEl.dataset.msg = msg;
            const spans = editingBlockEl.querySelectorAll('.editor-block-callout span');
            if (spans[1]) spans[1].textContent = msg;
            break;
        }
        case 'code': {
            const lang = document.getElementById('edit-lang').value;
            const code = document.getElementById('edit-code').value;
            editingBlockEl.dataset.lang = lang; editingBlockEl.dataset.code = code;
            const h = editingBlockEl.querySelector('.code-header span');
            const b = editingBlockEl.querySelector('.code-body');
            if (h) h.textContent = lang;
            if (b) b.textContent = code;
            break;
        }
        case 'video': {
            const url = document.getElementById('edit-url').value;
            editingBlockEl.dataset.url = url;
            break;
        }
    }

    document.getElementById('block-edit-modal').classList.add('hidden');
    editingBlockEl = null;
    scheduleSave();
});

// ═══════════════════════════════════════
//          TOOLBAR COMMANDS
// ═══════════════════════════════════════

document.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        updateToolbarState();
    });
});

document.querySelectorAll('[data-block]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand('formatBlock', false, `<${btn.dataset.block}>`);
        updateToolbarState();
    });
});

document.querySelectorAll('.editor-toolbar [data-action]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertBlockByType(btn.dataset.action.replace('insert', '').toLowerCase());
    });
});

function updateToolbarState() {
    document.querySelectorAll('.editor-toolbar [data-cmd]').forEach(btn => {
        btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
    });
}

editorContent.addEventListener('keyup', updateToolbarState);
editorContent.addEventListener('mouseup', () => { updateToolbarState(); showFloatingBar(); });

// ═══════════════════════════════════════
//         FLOATING FORMAT BAR
// ═══════════════════════════════════════

const floatingBar = document.getElementById('floating-format-bar');

function showFloatingBar() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorContent.contains(sel.anchorNode)) {
        floatingBar.classList.add('hidden'); return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { floatingBar.classList.add('hidden'); return; }
    floatingBar.classList.remove('hidden');
    floatingBar.style.top = `${rect.top + window.scrollY - 48}px`;
    floatingBar.style.left = `${Math.max(8, rect.left + rect.width / 2 - floatingBar.offsetWidth / 2)}px`;
}

floatingBar.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand(btn.dataset.cmd, false, null); });
});
floatingBar.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); insertBlockByType(btn.dataset.action.replace('insert', '').toLowerCase()); });
});

document.addEventListener('mousedown', (e) => {
    if (!floatingBar.contains(e.target)) {
        setTimeout(() => { const s = window.getSelection(); if (!s || s.isCollapsed) floatingBar.classList.add('hidden'); }, 100);
    }
});

// ═══════════════════════════════════════
//          SLASH COMMANDS
// ═══════════════════════════════════════

const SLASH_COMMANDS = [
    { id: 'h2', icon: 'H2', label: 'Titre', desc: 'Grand titre', cat: 'Texte' },
    { id: 'h3', icon: 'H3', label: 'Sous-titre', desc: 'Titre de section', cat: 'Texte' },
    { id: 'text', icon: '¶', label: 'Paragraphe', desc: 'Texte normal', cat: 'Texte' },
    { id: 'ul', icon: '•', label: 'Liste', desc: 'Liste à puces', cat: 'Texte' },
    { id: 'quote', icon: '❝', label: 'Citation', desc: 'Bloc citation', cat: 'Texte' },
    { id: 'code', icon: '{ }', label: 'Code', desc: 'Bloc de code', cat: 'Texte' },
    { id: 'image', icon: '🖼️', label: 'Image', desc: 'Insérer une image', cat: 'Média' },
    { id: 'gallery', icon: '🏞️', label: 'Galerie', desc: 'Grille d\'images', cat: 'Média' },
    { id: 'video', icon: '▶️', label: 'Vidéo', desc: 'Embed vidéo', cat: 'Média' },
    { id: 'carousel', icon: '🎠', label: 'Carousel', desc: 'Slides d\'images', cat: 'Média' },
    { id: 'signature', icon: '🏷️', label: 'Fiche Technique', desc: 'Vol / Alcool / Style', cat: 'Bière' },
    { id: 'meta', icon: '🌡️', label: 'Infos Bière', desc: 'Temp / Verre', cat: 'Bière' },
    { id: 'stats', icon: '📊', label: 'Statistiques', desc: 'Compteurs visuels', cat: 'Bière' },
    { id: 'quiz', icon: '🎮', label: 'Quiz', desc: 'Question interactive', cat: 'Interactif' },
    { id: 'accordion', icon: '📂', label: 'Accordéon', desc: 'Sections repliables', cat: 'Interactif' },
    { id: 'faq', icon: '❓', label: 'FAQ', desc: 'Question-Réponse', cat: 'Interactif' },
    { id: 'divider', icon: '—', label: 'Séparateur', desc: 'Ligne horizontale', cat: 'Layout' },
    { id: 'columns', icon: '▐▐', label: 'Colonnes', desc: '2 ou 3 colonnes', cat: 'Layout' },
    { id: 'callout', icon: '💡', label: 'Note', desc: 'Alerte / Info', cat: 'Layout' },
    { id: 'table', icon: '▦', label: 'Tableau', desc: 'Tableau de données', cat: 'Layout' },
];

let slashSelectedIndex = 0;
let slashFilteredCommands = [...SLASH_COMMANDS];

editorContent.addEventListener('input', () => { handleSlashTrigger(); updateWordCount(); scheduleSave(); });

function handleSlashTrigger() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== 3) { closeSlashMenu(); return; }
    const text = node.textContent;
    const pos = range.startOffset;
    const before = text.substring(0, pos);
    const idx = before.lastIndexOf('/');
    if (idx === -1 || (idx > 0 && before[idx-1] !== ' ' && before[idx-1] !== '\n')) { closeSlashMenu(); return; }
    const query = before.substring(idx + 1).toLowerCase();
    slashFilteredCommands = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(query) || c.id.includes(query));
    if (slashFilteredCommands.length === 0) { closeSlashMenu(); return; }
    slashSelectedIndex = 0;
    slashRange = { node, slashStart: idx, cursorPos: pos };
    showSlashMenu(range);
}

function showSlashMenu(range) {
    closeSlashMenu();
    const rect = range.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'slash-menu';
    menu.id = 'slash-menu';

    // Group by category
    const cats = {};
    slashFilteredCommands.forEach(c => { if (!cats[c.cat]) cats[c.cat] = []; cats[c.cat].push(c); });

    let idx = 0;
    Object.entries(cats).forEach(([cat, cmds]) => {
        const label = document.createElement('div');
        label.className = 'slash-menu-label';
        label.textContent = cat;
        menu.appendChild(label);
        cmds.forEach(cmd => {
            const item = document.createElement('div');
            item.className = `slash-menu-item ${idx === slashSelectedIndex ? 'selected' : ''}`;
            item.innerHTML = `<div class="slash-icon">${cmd.icon}</div><div class="slash-info"><div class="slash-label">${cmd.label}</div><div class="slash-desc">${cmd.desc}</div></div>`;
            item.addEventListener('mousedown', (e) => { e.preventDefault(); executeSlashCommand(cmd); });
            menu.appendChild(item);
            idx++;
        });
    });

    menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(menu);
    slashMenuRef = menu;
}

function closeSlashMenu() { if (slashMenuRef) { slashMenuRef.remove(); slashMenuRef = null; } slashRange = null; }

function executeSlashCommand(cmd) {
    if (slashRange) {
        const { node, slashStart, cursorPos } = slashRange;
        const text = node.textContent;
        node.textContent = text.substring(0, slashStart) + text.substring(cursorPos);
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStart(node, slashStart);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
    }
    closeSlashMenu();
    insertBlockByType(cmd.id);
    editorContent.focus();
}

editorContent.addEventListener('keydown', (e) => {
    if (slashMenuRef) {
        if (e.key === 'ArrowDown') { e.preventDefault(); slashSelectedIndex = (slashSelectedIndex + 1) % slashFilteredCommands.length; updateSlashSel(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); slashSelectedIndex = (slashSelectedIndex - 1 + slashFilteredCommands.length) % slashFilteredCommands.length; updateSlashSel(); }
        else if (e.key === 'Enter') { e.preventDefault(); executeSlashCommand(slashFilteredCommands[slashSelectedIndex]); }
        else if (e.key === 'Escape') { e.preventDefault(); closeSlashMenu(); }
    }
});

function updateSlashSel() {
    if (!slashMenuRef) return;
    slashMenuRef.querySelectorAll('.slash-menu-item').forEach((it, i) => it.classList.toggle('selected', i === slashSelectedIndex));
    const sel = slashMenuRef.querySelector('.slash-menu-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
}

document.addEventListener('click', (e) => { if (slashMenuRef && !slashMenuRef.contains(e.target)) closeSlashMenu(); });

// ═══════════════════════════════════════
//           WORD COUNT
// ═══════════════════════════════════════

function updateWordCount() {
    const text = editorContent.innerText || '';
    const w = text.trim().split(/\s+/).filter(x => x.length > 0).length;
    wordCountEl.textContent = `${w} mot${w !== 1 ? 's' : ''}`;
}

// ═══════════════════════════════════════
//          DRAFT MANAGEMENT
// ═══════════════════════════════════════

function scheduleSave() {
    clearTimeout(saveTimeout);
    statusDot.classList.add('saving');
    statusText.textContent = 'Sauvegarde…';
    saveTimeout = setTimeout(() => { saveDraft(); statusDot.classList.remove('saving'); statusText.textContent = 'Sauvegardé ✓'; }, 1500);
}

function saveDraft() {
    if (!currentDraftId) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (!data.drafts) data.drafts = {};
    data.activeId = currentDraftId;
    data.drafts[currentDraftId] = {
        id: currentDraftId,
        title: titleInput.value || 'Sans titre',
        subtitle: subtitleInput.value || '',
        icon: iconSelect.value || '🍺',
        author: authorInput.value || 'Beerpedia',
        role: roleInput.value || 'Éditeur',
        htmlContent: editorContent.innerHTML,
        lastMod: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDrafts() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (!data.drafts || Object.keys(data.drafts).length === 0) { createNewDraft(false); }
    else {
        currentDraftId = data.activeId || Object.keys(data.drafts)[0];
        if (!data.drafts[currentDraftId]) currentDraftId = Object.keys(data.drafts)[0];
        loadDraftContent(data.drafts[currentDraftId]);
    }
}

function loadDraftContent(draft) {
    if (!draft) return;
    titleInput.value = draft.title || '';
    subtitleInput.value = draft.subtitle || '';
    iconSelect.value = draft.icon || '🍺';
    authorInput.value = draft.author || 'Beerpedia';
    roleInput.value = draft.role || 'Éditeur';
    syncMetaSidebar();
    if (draft.htmlContent) editorContent.innerHTML = draft.htmlContent;
    else if (draft.blocks && Array.isArray(draft.blocks)) editorContent.innerHTML = convertLegacy(draft.blocks);
    else editorContent.innerHTML = '<p><br></p>';
    updateWordCount();
}

function convertLegacy(blocks) {
    let h = '';
    blocks.forEach(b => {
        switch (b.type) {
            case 'header': h += `<h3>${b.content||''}</h3>`; break;
            case 'text': h += `<p>${(b.content||'').replace(/\n/g,'<br>')}</p>`; break;
            case 'list': h += `<ul>${(b.content||'').split('\n').filter(x=>x.trim()).map(i=>`<li>${i}</li>`).join('')}</ul>`; break;
            case 'image': h += `<div style="text-align:center;margin:16px 0;"><img src="${b.content||''}" style="max-width:100%;border-radius:12px;"></div>`; break;
            case 'callout': h += `<blockquote>${b.content||''}</blockquote>`; break;
            case 'divider': h += '<hr>'; break;
            default: break;
        }
    });
    return h || '<p><br></p>';
}

function createNewDraft(save = true) {
    currentDraftId = 'draft_' + Date.now();
    titleInput.value = ''; subtitleInput.value = '';
    iconSelect.value = '🍺'; authorInput.value = 'Beerpedia'; roleInput.value = 'Éditeur';
    editorContent.innerHTML = '<p><br></p>';
    syncMetaSidebar(); updateWordCount();
    if (save) saveDraft();
    closeDraftsPanel();
}

function switchDraft(id) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data?.drafts?.[id]) {
        currentDraftId = id;
        loadDraftContent(data.drafts[id]);
        data.activeId = id;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        closeDraftsPanel();
    }
}

function deleteDraft(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('Supprimer ?')) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (data.drafts) delete data.drafts[id];
    if (id === currentDraftId) {
        const rem = Object.keys(data.drafts || {});
        if (rem.length > 0) { currentDraftId = rem[0]; data.activeId = currentDraftId; loadDraftContent(data.drafts[currentDraftId]); }
        else { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); createNewDraft(); return; }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderDraftsList();
}

function toggleDraftsPanel() {
    const p = document.getElementById('drafts-panel');
    if (p.classList.contains('hidden')) { renderDraftsList(); p.classList.remove('hidden'); }
    else p.classList.add('hidden');
}
function closeDraftsPanel() { document.getElementById('drafts-panel').classList.add('hidden'); }

function renderDraftsList() {
    const list = document.getElementById('drafts-list');
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    const drafts = data.drafts || {};
    list.innerHTML = Object.values(drafts).sort((a,b) => b.lastMod - a.lastMod).map(d => `
        <div class="draft-item ${d.id===currentDraftId?'active':''}" data-did="${d.id}">
            <div><div class="draft-item-title">${d.icon||'🍺'} ${d.title||'Sans titre'}</div><div class="draft-item-time">${new Date(d.lastMod).toLocaleString()}</div></div>
            <button class="btn-icon-editor" data-del="${d.id}">🗑️</button>
        </div>`).join('');
    list.querySelectorAll('.draft-item').forEach(it => {
        it.addEventListener('click', (e) => { if (!e.target.closest('[data-del]')) switchDraft(it.dataset.did); });
    });
    list.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', (e) => deleteDraft(b.dataset.del, e));
    });
}

// ═══════════════════════════════════════
//         METADATA SIDEBAR
// ═══════════════════════════════════════

const metaSidebar = document.getElementById('meta-sidebar');
const metaOverlay = document.getElementById('meta-overlay');
const iconSB = document.getElementById('meta-icon-sidebar');
const authorSB = document.getElementById('meta-author-sidebar');
const roleSB = document.getElementById('meta-role-sidebar');

function openMetaSidebar() { syncMetaSidebar(); metaSidebar.classList.add('open'); metaOverlay.classList.add('open'); }
function closeMetaSidebar() { iconSelect.value = iconSB.value; authorInput.value = authorSB.value; roleInput.value = roleSB.value; metaSidebar.classList.remove('open'); metaOverlay.classList.remove('open'); scheduleSave(); }
function syncMetaSidebar() { iconSB.value = iconSelect.value; authorSB.value = authorInput.value; roleSB.value = roleInput.value; }

document.getElementById('btn-meta-sidebar').addEventListener('click', openMetaSidebar);
document.getElementById('btn-close-meta').addEventListener('click', closeMetaSidebar);
metaOverlay.addEventListener('click', closeMetaSidebar);
iconSB.addEventListener('change', () => { iconSelect.value = iconSB.value; scheduleSave(); });
authorSB.addEventListener('input', () => { authorInput.value = authorSB.value; scheduleSave(); });
roleSB.addEventListener('input', () => { roleInput.value = roleSB.value; scheduleSave(); });

// ═══════════════════════════════════════
//            EXPORT HTML
// ═══════════════════════════════════════

function getExportHTML() {
    const icon = iconSelect.value || '🍺';
    const title = titleInput.value || 'Article';
    const subtitle = subtitleInput.value || '';
    const author = authorInput.value || 'Beerpedia';
    const role = roleInput.value || 'Éditeur';

    const tmp = document.createElement('div');
    tmp.innerHTML = editorContent.innerHTML;

    // Clean editor-block wrappers for export
    tmp.querySelectorAll('.block-controls').forEach(c => c.remove());
    tmp.querySelectorAll('.editor-block').forEach(b => { b.removeAttribute('contenteditable'); });

    // Convert signature blocks
    tmp.querySelectorAll('[data-type="signature"]').forEach(el => {
        el.outerHTML = `<div class="beer-signature"><div><div class="label">Volume</div><div class="value">${el.dataset.vol||'-'}</div></div><div><div class="label">Alcool</div><div class="value highlight">${el.dataset.abv||'-'}</div></div><div><div class="label">Style</div><div class="value">${el.dataset.style||'-'}</div></div></div>`;
    });

    // Convert FAQ blocks
    tmp.querySelectorAll('[data-type="faq"]').forEach(el => {
        el.outerHTML = `<details class="faq-item"><summary>${el.dataset.question||'?'}</summary><p>${el.dataset.answer||''}</p></details>`;
    });

    return `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Beerpedia</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&family=Russo+One&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
</head>
<body>
    <div id="app">
        <header class="app-header">
            <div class="logo"><a href="../index.html" style="text-decoration:none;display:flex;align-items:center;gap:10px;color:inherit;"><img src="../icons/logo-bnr.png" width="32" height="32" alt="Logo"><h1>Beerpedia</h1></a></div>
            <a href="../index.html" class="icon-btn" aria-label="Retour"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></a>
        </header>
        <main id="main-content" class="scroll-container">
            <div class="article-container fade-in">
                <header class="article-header">
                    <div class="article-icon">${icon}</div>
                    <h1>${title}</h1>
                    <p class="subtitle">${subtitle}</p>
                    <p class="article-author"><span style="color:#eee;">${author}</span> // <span style="font-style:italic;">${role}</span></p>
                </header>
                <div class="article-content">${tmp.innerHTML}</div>
                <div style="height:100px;"></div>
            </div>
        </main>
    </div>
    <script src="../js/runtime.js"><\/script>
</body>
</html>`;
}

function generateHTML() { document.getElementById('export-code').value = getExportHTML(); document.getElementById('export-modal').classList.remove('hidden'); }

function downloadHTML() {
    const html = getExportHTML();
    const fn = (titleInput.value || 'article').toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-') + '.html';
    const b = new Blob([html], {type:'text/html'});
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = fn; a.click();
    URL.revokeObjectURL(u);
}

// ═══════════════════════════════════════
//         IMPORT HTML
// ═══════════════════════════════════════

function processImport() {
    const code = document.getElementById('import-code').value;
    if (!code) return;
    const doc = new DOMParser().parseFromString(code, 'text/html');
    titleInput.value = doc.querySelector('h1')?.innerText || '';
    subtitleInput.value = doc.querySelector('.subtitle')?.innerText || '';
    iconSelect.value = doc.querySelector('.article-icon')?.innerText || '🍺';
    syncMetaSidebar();
    const content = doc.querySelector('.article-content');
    if (content) editorContent.innerHTML = content.innerHTML;
    else alert('Section .article-content introuvable.');
    updateWordCount(); scheduleSave();
    document.getElementById('import-modal').classList.add('hidden');
}

// ═══════════════════════════════════════
//           EVENT BINDINGS
// ═══════════════════════════════════════

document.getElementById('btn-drafts').addEventListener('click', toggleDraftsPanel);
document.getElementById('btn-close-drafts').addEventListener('click', closeDraftsPanel);
document.getElementById('btn-new-draft').addEventListener('click', () => createNewDraft());
document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-modal').classList.remove('hidden'));
document.getElementById('btn-cancel-import').addEventListener('click', () => document.getElementById('import-modal').classList.add('hidden'));
document.getElementById('btn-do-import').addEventListener('click', processImport);
document.getElementById('btn-export-view').addEventListener('click', generateHTML);
document.getElementById('btn-download').addEventListener('click', downloadHTML);
document.getElementById('btn-close-export').addEventListener('click', () => document.getElementById('export-modal').classList.add('hidden'));
document.getElementById('btn-cancel-insert').addEventListener('click', closeInsertModal);
document.getElementById('btn-do-insert').addEventListener('click', submitInsertModal);

titleInput.addEventListener('input', scheduleSave);
subtitleInput.addEventListener('input', scheduleSave);
iconSelect.addEventListener('change', scheduleSave);
authorInput.addEventListener('input', scheduleSave);
roleInput.addEventListener('input', scheduleSave);

// ═══════════════════════════════════════
//         KEYBOARD SHORTCUTS
// ═══════════════════════════════════════

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveDraft(); statusDot.classList.remove('saving'); statusText.textContent = 'Sauvegardé ✓'; }
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); generateHTML(); }
});

// ═══════════════════════════════════════
//              INIT
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    loadDrafts();
    updateWordCount();
    editorContent.focus();
});
