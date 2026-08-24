export const GUIDE_HTML = `
<div class="guide-container">
    <header class="guide-header">
        <h1>Beerpedia</h1>
        <p class="subtitle">Comprendre, Choisir, Déguster.</p>
        <div style="margin-top: 30px; display:flex; flex-direction:column; gap:15px; align-items:center;">
            <input type="text" id="beer-search" placeholder="🔍 Rechercher un style (ex: IPA)..." 
                style="padding:15px; border-radius:30px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.4); color:white; width:100%; max-width:400px; text-align:center; font-size:1.1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="display:flex; gap:15px;">
                <a href="articles/intro.html" class="btn-small-outline" style="border-radius:25px; padding: 10px 20px;">📖 Découvrir Beerdex</a>
                <button id="btn-random-article" class="btn-small-outline" style="border-radius:25px; padding: 10px 20px; background:rgba(245, 197, 24, 0.1); border:1px solid var(--accent-gold); color:var(--accent-gold); cursor:pointer;">🎲 Aléatoire</button>
            </div>
        </div>
    </header>

    <section class="guide-section" id="beer-types">
        <h2>🍺 Les Grandes Familles de Bières</h2>
        <p class="intro-text" style="font-size:1.1rem;">Le monde de la bière est vaste. Voici les principaux styles pour vous y retrouver, de la plus rafraîchissante à la plus complexe.</p>

        <div class="beer-type-grid" id="beer-type-grid" style="margin-top: 30px;">
            <!-- Dynamic Content Injected by app.js -->
        </div>
    </section>

    <div class="divider"></div>

    <section class="guide-section" id="how-to-choose">
        <h2>🤔 Comment Choisir sa bière ?</h2>
        <div class="choice-flow" style="background: var(--bg-card); border: var(--glass-border); padding: 30px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <p style="font-size:1.1rem; margin-bottom:20px;">Vous ne savez pas quoi prendre ? Suivez le guide selon vos envies du moment :</p>
            <ul class="choice-list" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <li style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><strong>Il fait chaud, j'ai soif :</strong> Optez pour une <span class="highlight">Pilsner</span> ou une <span class="highlight">Blanche</span>.</li>
                <li style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><strong>J'aime l'amertume :</strong> Foncez sur une <span class="highlight">IPA</span> ou une <span class="highlight">Pale Ale</span>.</li>
                <li style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><strong>J'aime le sucré & fort :</strong> Une <span class="highlight">Triple</span> ou une <span class="highlight">Quadrupel</span> sera parfaite.</li>
                <li style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><strong>Je veux être surpris :</strong> Essayez une <span class="highlight">Sour</span> ou une <span class="highlight">Gueuze</span>.</li>
                <li style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><strong>J'aime le café :</strong> Un <span class="highlight">Stout</span> ou Porter est fait pour vous.</li>
            </ul>
        </div>
    </section>

    <section class="guide-section" id="beer-style-map">
        <h2>🧭 La Carte des Styles</h2>
        <p class="intro-text">Les bières se classent souvent selon deux axes majeurs : l'intensité (Alcool/Corps) et la Balance (Douceur/Amertume).</p>

        <div class="style-map-container">
            <div class="map-label top">Fort / Intense</div>
            <div class="map-label bottom">Léger / Subtil</div>
            <div class="map-label left">Douceur / Malts</div>
            <div class="map-label right">Amertume / Houblons</div>

            <!-- Quadrants -->
            <div class="map-grid"></div>

            <!-- Beer Dots -->
            <div class="beer-dot" style="top: 20%; left: 80%;" data-label="Double IPA"></div>
            <div class="beer-dot" style="top: 30%; left: 20%;" data-label="Quadrupel"></div>
            <div class="beer-dot" style="top: 70%; left: 85%;" data-label="Pilsner"></div>
            <div class="beer-dot" style="top: 60%; left: 15%;" data-label="Blanche"></div>
            <div class="beer-dot" style="top: 15%; left: 45%;" data-label="Stout Impérial"></div>
            <div class="beer-dot" style="top: 80%; left: 50%;" data-label="Lager"></div>
            <div class="beer-dot" style="top: 50%; left: 90%;" data-label="IPA"></div>
            <div class="beer-dot" style="top: 50%; left: 30%;" data-label="Double"></div>
            <div class="beer-dot" style="top: 50%; left: 10%;" data-label="Stout"></div>
            <div class="beer-dot" style="top: 40%; left: 60%;" data-label="Saison"></div>
        </div>
        <p style="font-size:0.9rem; color:#888; text-align:center; margin-top:15px; font-style:italic;">Cliquez sur un point pour voir le style.</p>
    </section>

    <div class="divider"></div>

    <section class="guide-section" id="beer-quiz">
        <h2>🎮 Quiz : Quelle bière êtes-vous ?</h2>
        <div id="quiz-container" class="quiz-box">
            <div id="quiz-start">
                <p style="font-size:1.2rem; color:#ccc;">Répondez à 3 questions simples et nous trouverons votre bière idéale.</p>
                <button id="btn-quiz-start" class="btn-primary" style="margin-top:30px; font-size:1.2rem;">Commencer le Quiz</button>
            </div>
            <div id="quiz-question" class="hidden" style="width:100%;">
                <h3 id="q-text" style="color:var(--accent-gold);">Question...</h3>
                <div id="q-options" class="quiz-options"></div>
            </div>
            <div id="quiz-result" class="hidden">
                <div class="result-icon" style="font-size: 5rem; filter: drop-shadow(0 0 15px rgba(245, 197, 24, 0.4));">🍺</div>
                <h3 style="font-size: 2.2rem; margin-bottom: 10px;">Votre résultat : <br><span id="res-title" style="color:var(--accent-gold)"></span></h3>
                <p id="res-desc" style="font-size: 1.1rem; color: #ccc; max-width: 600px; margin: 0 auto; line-height:1.6;"></p>
                <button id="btn-quiz-reset" class="btn-secondary" style="margin-top:30px; width:auto; padding: 10px 30px;">Recommencer</button>
            </div>
        </div>
    </section>

    <div class="divider"></div>

    <section class="guide-section" id="history">
        <h2>📜 Petite Histoire de la Bière</h2>
        <div class="timeline" style="background: var(--bg-card); border: var(--glass-border); padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="timeline-item">
                <span class="date">-4000 av. J.C.</span>
                <p>Les Sumériens inventent le "pain liquide". La bière est née en Mésopotamie.</p>
            </div>
            <div class="timeline-item">
                <span class="date">Moyen Âge</span>
                <p>Les moines perfectionnent le brassage et introduisent le houblon pour la conservation, structurant la bière moderne.</p>
            </div>
            <div class="timeline-item">
                <span class="date">Années 1800</span>
                <p>Révolution industrielle. Naissance de la Pilsner dorée et limpide, dont le succès est propulsé par la généralisation du verre transparent.</p>
            </div>
            <div class="timeline-item" style="margin-bottom:0;">
                <span class="date">Années 1970 à aujourd'hui</span>
                <p>Révolution Craft (Artisanale) aux États-Unis, puis retour en force en Europe. Diversité explosive des styles et des saveurs.</p>
            </div>
        </div>
    </section>

    <div class="divider"></div>

    <section class="guide-section" id="about-beerdex">
        <h2>🦊 À propos de Beerdex</h2>
        <p class="intro-text" style="font-size:1.15rem; line-height:1.8; text-align:center; max-width:800px; margin: 0 auto 40px auto;">
            Beerdex est né d'une idée simple : pourquoi devoir utiliser des applications lourdes, remplies de publicités intrusives et qui revendent vos données personnelles, juste pour se souvenir d'une bonne bière dégustée entre amis ?
        </p>

        <div class="features-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="feat-item" style="background: rgba(255,255,255,0.03); border: var(--glass-border); padding: 25px; border-radius: 16px; text-align:center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">💸</div>
                <strong style="color:var(--accent-gold); font-size:1.1rem; display:block; margin-bottom:5px;">100% Gratuit</strong>
                <span style="color:#aaa;">Pas de version premium, aucune publicité.</span>
            </div>
            <div class="feat-item" style="background: rgba(255,255,255,0.03); border: var(--glass-border); padding: 25px; border-radius: 16px; text-align:center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🔒</div>
                <strong style="color:var(--accent-gold); font-size:1.1rem; display:block; margin-bottom:5px;">Privé</strong>
                <span style="color:#aaa;">Vos données restent stockées sur votre propre appareil.</span>
            </div>
            <div class="feat-item" style="background: rgba(255,255,255,0.03); border: var(--glass-border); padding: 25px; border-radius: 16px; text-align:center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">⚡</div>
                <strong style="color:var(--accent-gold); font-size:1.1rem; display:block; margin-bottom:5px;">Ultra Rapide</strong>
                <span style="color:#aaa;">Construit avec une architecture légère et optimisée.</span>
            </div>
            <div class="feat-item" style="background: rgba(255,255,255,0.03); border: var(--glass-border); padding: 25px; border-radius: 16px; text-align:center;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📱</div>
                <strong style="color:var(--accent-gold); font-size:1.1rem; display:block; margin-bottom:5px;">Installable (PWA)</strong>
                <span style="color:#aaa;">Fonctionne hors-ligne comme une vraie application native.</span>
            </div>
        </div>

        <div class="article-signature" style="margin-top:60px; text-align:center; padding: 40px; background: var(--bg-card); border-radius: 20px; border: var(--glass-border); box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
            <p style="font-size: 1.4rem; margin-bottom:15px; color: #fff;">Santé et bonne dégustation ! 🍻</p>
            <div class="sign-block" style="display:flex; flex-direction:column; align-items:center;">
                <span class="sign-name" style="font-weight:900; color:var(--accent-gold); font-size:1.3rem; letter-spacing:1px; text-transform:uppercase;">DualsFWShield</span>
                <span class="sign-role" style="font-size:1rem; color:var(--text-secondary); margin-top:5px;">Développeur et Brasseur amateur</span>
            </div>
        </div>
    </section>

    <div style="height: 100px;"></div>
</div>
`;
