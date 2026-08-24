// ======================================
// BEERPEDIA ARTICLE EDITOR - v3.0 (Quill WYSIWYG)
// ======================================

const BlockEmbed = Quill.import('blots/block/embed');

// 1. FAQ Blot
class FaqBlot extends BlockEmbed {
    static create(value) {
        let node = super.create();
        node.setAttribute('data-question', value.question || '');
        node.setAttribute('data-answer', value.answer || '');
        node.innerHTML = `<div class="editor-block-preview faq-preview" contenteditable="false" style="padding:15px; background:rgba(255,255,255,0.05); border-left:4px solid var(--accent-gold); border-radius:8px; margin:10px 0; cursor:pointer;">
            <div style="font-weight:bold; color:#fff;">❓ ${value.question || 'Question ?'}</div>
            <div style="color:#aaa; font-size:0.9rem; margin-top:5px;">${value.answer || 'Réponse...'}</div>
        </div>`;
        return node;
    }
    static value(node) {
        return {
            question: node.getAttribute('data-question'),
            answer: node.getAttribute('data-answer')
        };
    }
}
FaqBlot.blotName = 'faq';
FaqBlot.tagName = 'div';
FaqBlot.className = 'blot-faq';
Quill.register(FaqBlot);

// 2. Quote Blot
class QuoteBlot extends BlockEmbed {
    static create(value) {
        let node = super.create();
        node.setAttribute('data-text', value.text || '');
        node.setAttribute('data-author', value.author || '');
        node.innerHTML = `<div class="editor-block-preview quote-preview" contenteditable="false" style="padding:15px; background:rgba(255,255,255,0.02); border-left:4px solid #666; font-style:italic; border-radius:8px; margin:10px 0; cursor:pointer;">
            <div style="color:#ddd;">"${value.text || '...'}"</div>
            ${value.author ? `<div style="color:#888; font-size:0.85rem; margin-top:10px;">— ${value.author}</div>` : ''}
        </div>`;
        return node;
    }
    static value(node) {
        return {
            text: node.getAttribute('data-text'),
            author: node.getAttribute('data-author')
        };
    }
}
QuoteBlot.blotName = 'quote';
QuoteBlot.tagName = 'div';
QuoteBlot.className = 'blot-quote';
Quill.register(QuoteBlot);

// 3. Note Blot
class NoteBlot extends BlockEmbed {
    static create(value) {
        let node = super.create();
        node.setAttribute('data-text', value.text || '');
        node.innerHTML = `<div class="editor-block-preview note-preview" contenteditable="false" style="padding:15px; background:rgba(245, 197, 24, 0.1); border:1px solid var(--accent-gold); border-radius:8px; margin:10px 0; cursor:pointer;">
            <div style="color:var(--accent-gold); font-weight:bold; margin-bottom:5px;">💡 Note</div>
            <div style="color:#eee;">${value.text || '...'}</div>
        </div>`;
        return node;
    }
    static value(node) {
        return { text: node.getAttribute('data-text') };
    }
}
NoteBlot.blotName = 'note';
NoteBlot.tagName = 'div';
NoteBlot.className = 'blot-note';
Quill.register(NoteBlot);

// 4. Card Blot
class CardBlot extends BlockEmbed {
    static create(value) {
        let node = super.create();
        node.setAttribute('data-title', value.title || '');
        node.setAttribute('data-text', value.text || '');
        node.setAttribute('data-image', value.image || '');
        node.innerHTML = `<div class="editor-block-preview card-preview" contenteditable="false" style="display:flex; gap:15px; padding:15px; background:#1a1a1a; border-radius:12px; border:1px solid #333; margin:10px 0; cursor:pointer;">
            ${value.image ? `<img src="${value.image}" style="width:100px; height:100px; object-fit:cover; border-radius:8px;">` : `<div style="width:100px; height:100px; background:#222; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#555;">Image</div>`}
            <div style="flex:1;">
                <div style="color:var(--accent-gold); font-weight:bold; font-size:1.1rem; margin-bottom:5px;">${value.title || 'Titre'}</div>
                <div style="color:#aaa; font-size:0.9rem;">${value.text || 'Description...'}</div>
            </div>
        </div>`;
        return node;
    }
    static value(node) {
        return {
            title: node.getAttribute('data-title'),
            text: node.getAttribute('data-text'),
            image: node.getAttribute('data-image')
        };
    }
}
CardBlot.blotName = 'card';
CardBlot.tagName = 'div';
CardBlot.className = 'blot-card';
Quill.register(CardBlot);

let quill;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quill editor
    quill = new Quill('#editor-container', {
        modules: {
            toolbar: {
                container: '#toolbar-container',
                handlers: {
                    'insertFaq': function() { openBlockModal('faq'); },
                    'insertCard': function() { openBlockModal('card'); },
                    'insertQuote': function() { openBlockModal('quote'); },
                    'insertNote': function() { openBlockModal('note'); }
                }
            }
        },
        theme: 'snow',
        placeholder: 'Rédigez votre article ici...'
    });

    // Listeners for double click to edit custom blots
    quill.root.addEventListener('dblclick', (e) => {
        const blotNode = e.target.closest('.editor-block-preview');
        if (blotNode) {
            let blot = Quill.find(blotNode.parentNode);
            if (blot) editExistingBlot(blot);
        }
    });

    // Listeners for draft saving
    quill.on('text-change', () => {
        saveDraft();
    });

    const metaInputs = ['meta-title', 'meta-subtitle', 'meta-icon', 'meta-author', 'meta-role', 'meta-temp', 'meta-glass', 'meta-volume', 'meta-abv', 'meta-style'];
    metaInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', saveDraft);
        if(el && el.tagName === 'SELECT') el.addEventListener('change', saveDraft);
    });

    loadDrafts();
});

// --- Draft Management ---
const STORAGE_KEY = 'beerpedia_editor_data';
let currentDraftId = null;

function loadDrafts() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (!data.drafts || Object.keys(data.drafts).length === 0) {
        createNewDraft(false);
    } else {
        currentDraftId = data.activeId || Object.keys(data.drafts)[0];
        if (!data.drafts[currentDraftId]) currentDraftId = Object.keys(data.drafts)[0];
        loadDraftContent(data.drafts[currentDraftId]);
    }
    renderDraftsList();
}

function loadDraftContent(draft) {
    if (!draft) return;
    document.getElementById('meta-title').value = draft.title || '';
    document.getElementById('meta-subtitle').value = draft.subtitle || '';
    document.getElementById('meta-icon').value = draft.icon || '🍺';
    document.getElementById('meta-author').value = draft.author || 'Beerpedia';
    document.getElementById('meta-role').value = draft.role || 'Éditeur';
    
    document.getElementById('meta-temp').value = draft.temp || '';
    document.getElementById('meta-glass').value = draft.glass || '';
    document.getElementById('meta-volume').value = draft.volume || '';
    document.getElementById('meta-abv').value = draft.abv || '';
    document.getElementById('meta-style').value = draft.style || '';

    // Load Quill content
    if(draft.quillContent) {
        quill.setContents(draft.quillContent);
    } else if(draft.htmlContent) {
        quill.root.innerHTML = draft.htmlContent;
    } else {
        quill.setText('');
    }
}

window.createNewDraft = (shouldSave = true) => {
    const id = 'draft_' + Date.now();
    currentDraftId = id;

    const metaInputs = ['meta-title', 'meta-subtitle', 'meta-author', 'meta-role', 'meta-temp', 'meta-glass', 'meta-volume', 'meta-abv', 'meta-style'];
    metaInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    document.getElementById('meta-icon').value = '🍺';
    document.getElementById('meta-author').value = 'Beerpedia';
    document.getElementById('meta-role').value = 'Éditeur';
    
    quill.setText('');

    if (shouldSave) saveDraft();
    toggleDraftsPanel(false);
};

function saveDraft() {
    if (!currentDraftId) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (!data.drafts) data.drafts = {};

    const title = document.getElementById('meta-title').value || 'Sans titre';

    data.activeId = currentDraftId;
    data.drafts[currentDraftId] = {
        id: currentDraftId,
        title,
        subtitle: document.getElementById('meta-subtitle').value,
        icon: document.getElementById('meta-icon').value,
        author: document.getElementById('meta-author').value,
        role: document.getElementById('meta-role').value,
        temp: document.getElementById('meta-temp').value,
        glass: document.getElementById('meta-glass').value,
        volume: document.getElementById('meta-volume').value,
        abv: document.getElementById('meta-abv').value,
        style: document.getElementById('meta-style').value,
        quillContent: quill.getContents(),
        htmlContent: quill.root.innerHTML,
        lastMod: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderDraftsList();
}

window.deleteDraft = (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Supprimer ce brouillon ?')) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    if (data.drafts) delete data.drafts[id];

    if (id === currentDraftId) {
        const remaining = data.drafts ? Object.keys(data.drafts) : [];
        if (remaining.length > 0) {
            currentDraftId = remaining[0];
            data.activeId = currentDraftId;
            loadDraftContent(data.drafts[currentDraftId]);
        } else {
            currentDraftId = null;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            window.createNewDraft();
            return;
        }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderDraftsList();
};

window.switchDraft = (id) => {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && data.drafts && data.drafts[id]) {
        currentDraftId = id;
        loadDraftContent(data.drafts[id]);
        data.activeId = id;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        toggleDraftsPanel(false);
    }
};

window.toggleDraftsPanel = (forceState) => {
    const panel = document.getElementById('drafts-panel');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    const show = forceState !== undefined ? forceState : isHidden;

    if (show) {
        renderDraftsList();
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
};

function renderDraftsList() {
    const list = document.getElementById('drafts-list');
    if (!list) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"drafts":{}}');
    const drafts = data.drafts || {};

    list.innerHTML = Object.values(drafts)
        .sort((a, b) => b.lastMod - a.lastMod)
        .map(d => `
            <div onclick="switchDraft('${d.id}')" class="draft-item ${d.id === currentDraftId ? 'active' : ''}">
                <div>
                    <div style="font-weight:bold; color:#fff; font-size:0.9rem;">${d.icon || '🍺'} ${d.title || 'Sans titre'}</div>
                    <div style="font-size:0.7rem; color:#888;">${new Date(d.lastMod).toLocaleTimeString()}</div>
                </div>
                <button onclick="deleteDraft('${d.id}', event)" class="btn-icon" style="font-size:1rem; color:#555;">🗑️</button>
            </div>
        `).join('');
}

// --- Export HTML Generation ---
function getExportHTML() {
    const icon = document.getElementById('meta-icon').value || '🍺';
    const title = document.getElementById('meta-title').value || 'Article';
    const subtitle = document.getElementById('meta-subtitle').value || '';
    const author = document.getElementById('meta-author').value || 'Beerpedia';
    const role = document.getElementById('meta-role').value || 'Éditeur';
    
    const temp = document.getElementById('meta-temp').value;
    const glass = document.getElementById('meta-glass').value;
    const volume = document.getElementById('meta-volume').value;
    const abv = document.getElementById('meta-abv').value;
    const style = document.getElementById('meta-style').value;

    let metaHTML = '';
    if(temp || glass) {
        metaHTML = `
                <div class="article-meta" style="display:flex; gap:10px; margin:20px 0; justify-content:center;">
                    ${temp ? `<span style="background:rgba(255,192,0,0.1); color:var(--accent-gold); padding:5px 12px; border-radius:20px; border:1px solid rgba(255,192,0,0.3);">🌡️ ${temp}</span>` : ''}
                    ${glass ? `<span style="background:rgba(255,192,0,0.1); color:var(--accent-gold); padding:5px 12px; border-radius:20px; border:1px solid rgba(255,192,0,0.3);">🍺 ${glass}</span>` : ''}
                </div>`;
    }

    let signatureHTML = '';
    if(volume || abv || style) {
        signatureHTML = `
                <div class="beer-signature" style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:15px; margin:20px 0; display:flex; justify-content:space-around; align-items:center;">
                    ${volume ? `<div style="text-align:center;"><div style="color:#888; font-size:0.7rem; text-transform:uppercase;">Volume</div><div style="color:#fff; font-weight:bold;">${volume}</div></div>` : ''}
                    ${volume && (abv || style) ? `<div style="width:1px; height:30px; background:#333;"></div>` : ''}
                    ${abv ? `<div style="text-align:center;"><div style="color:#888; font-size:0.7rem; text-transform:uppercase;">Alcool</div><div style="color:var(--accent-gold); font-weight:bold;">${abv}</div></div>` : ''}
                    ${abv && style ? `<div style="width:1px; height:30px; background:#333;"></div>` : ''}
                    ${style ? `<div style="text-align:center;"><div style="color:#888; font-size:0.7rem; text-transform:uppercase;">Style</div><div style="color:#fff; font-weight:bold;">${style}</div></div>` : ''}
                </div>`;
    }

    let editorContent = quill.root.innerHTML;
    
    // Convert Custom Blots to Semantic HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorContent;

    // FAQ
    tempDiv.querySelectorAll('.blot-faq').forEach(el => {
        const q = el.getAttribute('data-question');
        const a = el.getAttribute('data-answer');
        el.outerHTML = `
            <div class="faq-item" style="margin:15px 0; background:#1a1a1a; border-radius:8px; overflow:hidden;">
                <div style="padding:12px 15px; background:#252525; font-weight:bold; color:#fff;">❓ ${q}</div>
                <div style="padding:12px 15px; color:#ccc; line-height:1.5;">${a.replace(/\n/g, '<br>')}</div>
            </div>`;
    });

    // Quote
    tempDiv.querySelectorAll('.blot-quote').forEach(el => {
        const text = el.getAttribute('data-text');
        const author = el.getAttribute('data-author');
        el.outerHTML = `
            <blockquote style="margin:20px 0; padding:15px 20px; border-left:4px solid #555; background:rgba(255,255,255,0.03); font-style:italic; color:#ddd;">
                "${text.replace(/\n/g, '<br>')}"
                ${author ? `<footer style="margin-top:10px; font-size:0.9rem; color:#888;">— ${author}</footer>` : ''}
            </blockquote>`;
    });

    // Note
    tempDiv.querySelectorAll('.blot-note').forEach(el => {
        const text = el.getAttribute('data-text');
        el.outerHTML = `
            <div style="background:rgba(245, 197, 24, 0.1); padding:15px; border-radius:8px; border-left:4px solid var(--accent-gold); margin:15px 0;">
                <strong style="color:var(--accent-gold);">💡 Note :</strong>
                <p style="margin:5px 0 0 0; color:#eee;">${text.replace(/\n/g, '<br>')}</p>
            </div>`;
    });

    // Card
    tempDiv.querySelectorAll('.blot-card').forEach(el => {
        const title = el.getAttribute('data-title');
        const text = el.getAttribute('data-text');
        const image = el.getAttribute('data-image');
        el.outerHTML = `
            <div class="beer-card" style="display:flex; gap:20px; background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:20px; margin:20px 0;">
                ${image ? `<img src="${image}" style="width:120px; height:120px; object-fit:cover; border-radius:8px;" alt="${title}">` : ''}
                <div>
                    <h3 style="color:var(--accent-gold); margin-top:0; margin-bottom:10px;">${title}</h3>
                    <p style="color:#ccc; margin:0; line-height:1.5;">${text.replace(/\n/g, '<br>')}</p>
                </div>
            </div>`;
    });

    editorContent = tempDiv.innerHTML;

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
            <div class="logo">
                <a href="../index.html" style="text-decoration:none; display:flex; align-items:center; gap:10px; color:inherit;">
                    <img src="../icons/logo-bnr.png" width="32" height="32" alt="Beerpedia Logo">
                    <h1>Beerpedia</h1>
                </a>
            </div>
            <a href="../index.html" class="icon-btn" aria-label="Retour">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
            </a>
        </header>

        <main id="main-content" class="scroll-container">
            <div class="article-container fade-in">
                <header class="article-header" style="text-align:center; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); margin-bottom:20px;">
                    <div class="article-icon" style="font-size:3rem;">${icon}</div>
                    <h1 style="color:var(--accent-gold); font-size:2rem; margin-bottom:5px;">${title}</h1>
                    <p class="subtitle" style="color:#aaa;">${subtitle}</p>
                    <p class="article-author" style="font-size:0.8rem; color:#666; margin-top:10px;">
                        <span style="color:#eee;">${author}</span> // <span style="font-style:italic;">${role}</span>
                    </p>
                </header>

                <div class="article-content">
${metaHTML}
${signatureHTML}
<br>
${editorContent}
                </div>
                
                <div style="height: 100px;"></div>
            </div>
        </main>
    </div>
</body>
</html>`;
}

window.downloadHTML = () => {
    const html = getExportHTML();
    const title = document.getElementById('meta-title').value || 'article';
    const filename = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '.html';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// Modals & Blocks
let currentEditBlot = null;

window.openBlockModal = (type, existingData = null) => {
    currentEditBlot = null;
    
    if(type === 'faq') {
        document.getElementById('faq-question').value = existingData ? existingData.question : '';
        document.getElementById('faq-answer').value = existingData ? existingData.answer : '';
    } else if(type === 'quote') {
        document.getElementById('quote-text').value = existingData ? existingData.text : '';
        document.getElementById('quote-author').value = existingData ? existingData.author : '';
    } else if(type === 'note') {
        document.getElementById('note-text').value = existingData ? existingData.text : '';
    } else if(type === 'card') {
        document.getElementById('card-title').value = existingData ? existingData.title : '';
        document.getElementById('card-text').value = existingData ? existingData.text : '';
        document.getElementById('card-image').value = existingData ? existingData.image : '';
    }

    document.getElementById(`${type}-modal`).classList.remove('hidden');
};

window.editExistingBlot = (blot) => {
    currentEditBlot = blot;
    openBlockModal(blot.statics.blotName, blot.value());
};

function insertOrUpdateBlot(type, value) {
    if (currentEditBlot) {
        // Update existing
        const index = quill.getIndex(currentEditBlot);
        quill.deleteText(index, 1);
        quill.insertEmbed(index, type, value);
    } else {
        // Insert new
        const range = quill.getSelection(true) || { index: quill.getLength() - 1 };
        quill.insertEmbed(range.index, type, value);
        quill.setSelection(range.index + 1);
    }
    document.getElementById(`${type}-modal`).classList.add('hidden');
    saveDraft();
}

window.saveFaqBlock = () => insertOrUpdateBlot('faq', {
    question: document.getElementById('faq-question').value,
    answer: document.getElementById('faq-answer').value
});
window.saveQuoteBlock = () => insertOrUpdateBlot('quote', {
    text: document.getElementById('quote-text').value,
    author: document.getElementById('quote-author').value
});
window.saveNoteBlock = () => insertOrUpdateBlot('note', {
    text: document.getElementById('note-text').value
});
window.saveCardBlock = () => insertOrUpdateBlot('card', {
    title: document.getElementById('card-title').value,
    text: document.getElementById('card-text').value,
    image: document.getElementById('card-image').value
});

window.processImport = () => {
    const code = document.getElementById('import-code').value;
    if(!code) return;

    // Very basic extraction of content inside .article-content for Quill
    const match = code.match(/<div class="article-content">([\s\S]*?)<\/div>\s*<div style="height: 100px;">/);
    if(match && match[1]) {
        // Strip out the custom blocks from the import so they don't pollute the text editor
        let html = match[1];
        html = html.replace(/<div class="article-meta"[\s\S]*?<\/div>/, '');
        html = html.replace(/<div class="beer-signature"[\s\S]*?<\/div>/, '');
        quill.root.innerHTML = html.trim();
    } else {
        quill.root.innerHTML = code;
    }

    document.getElementById('import-modal').classList.add('hidden');
    saveDraft();
};
