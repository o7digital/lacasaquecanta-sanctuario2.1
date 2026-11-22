# El Sanctuario — La Casa Que Canta

## Version développée — 22 novembre 2026

Revue web Astro + React + TypeScript issue des sources de `dist/`, avec la direction visuelle, les photographies et La lettre du chef conservées.

- Aperçu anglais : https://el-sanctuario-21.vercel.app/en/
- Aperçu espagnol : https://el-sanctuario-21.vercel.app/es/
- Studio éditorial : https://el-sanctuario-21.vercel.app/admin/
- Dépôt : `o7digital/lacasaquecanta-sanctuario2.1`, branche `codex/el-sanctuario`.
- Projet Vercel séparé : `olivier-steineur/el-sanctuario-21`. Le site hôtelier actuel n'est pas remplacé.
- Newsletter : raccordement préparé, activation en attente de validation à la demande d'Olivier.

Node.js 24 LTS et npm :

```sh
npm ci
npm run dev
```

Ouvrir l'URL annoncée par Astro dans Firefox, normalement `http://127.0.0.1:4321/en/`.

```sh
npm run check
npm test
npm run test:e2e
npm run build
```

Consulter **[DEVELOPMENT.md](DEVELOPMENT.md)** pour l'administration, les variables, les intégrations, les limites et les commandes de déploiement. Les tests navigateur utilisent Firefox (`npx playwright install firefox` si nécessaire).

`dist/` et `El_Sanctuario.html` restent inchangés comme références reçues ; l'application actuelle est dans `src/`, `public/`, et sa compilation dans `build/`. Les empreintes `SHA256SUMS.txt` décrivent le paquet initial, avant l'évolution de la documentation.

<details>
<summary>Documentation historique du ZIP reçu</summary>

Code de la nouvelle maquette éditoriale, avec photographies, polices, contenus anglais/espagnol et instructions de reprise dans Codex.

## Commencer

1. Pour voir la maquette rapidement, ouvrir `El_Sanctuario.html` dans un navigateur. Les photographies, polices et scripts sont intégrés dans ce fichier. La météo nécessite Internet. Aucun compte ChatGPT n'est nécessaire.
2. Pour travailler dans Codex, utiliser les fichiers séparés dans `dist/` et lire `CODEX_INSTRUCTIONS.md`.
3. Le court message à coller dans Codex est dans `PROMPT_CODEX.txt`.

## Lancement local des sources

Depuis ce dossier, avec Python 3 disponible :

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Ouvrir http://127.0.0.1:8080/ dans le navigateur. Aucune installation de dépendances ni compilation n'est requise pour cette maquette HTML/CSS/JavaScript.

Ne pas ouvrir directement `dist/index.html` en file:// : les chemins des ressources partent de la racine du serveur. Utiliser le serveur local ou le fichier autonome `El_Sanctuario.html`.

## Contenu du dossier

- `dist/index.html` : structure de la revue et formulaires.
- `dist/style.css` : mise en page responsive et styles.
- `dist/app.js` : textes EN/ES, articles, recherche, météo et interactions.
- `dist/assets/` : photos authentiques, polices et icônes.
- `dist/manifest.webmanifest` et `dist/sw.js` : base PWA et cache simple.
- `El_Sanctuario.html` : aperçu autonome à ouvrir sans serveur.
- `CODEX_INSTRUCTIONS.md` : cahier des charges et séquence de développement.
- `PROMPT_CODEX.txt` : message court pour lancer la reprise.
- `ETAT_FONCTIONNEL.md` : distinction entre ce qui fonctionne et les connexions à réaliser.
- `asset-sources.json` : URLs d'origine des photographies.
- `licenses/` : licences des polices et notice des images.
- `SOURCE_INFO.json` et `SHA256SUMS.txt` : provenance et contrôle des fichiers.

## État de livraison

Il s'agit d'un prototype interactif HTML/CSS/JS. Il n'est pas encore converti en Astro/React et ne comporte pas de backend, de CMS ou d'application native.

La lecture, les langues, la recherche, les filtres, le carnet local et les parcours de démonstration sont présents. La météo utilise une API distante. La newsletter ne crée pas d'inscription réelle. Les demandes de séjour préparent un email, et un lien mène au moteur de réservation officiel.

Consulter `ETAT_FONCTIONNEL.md` pour le détail avant de raccorder les services.

## Hébergement

Les fichiers de `dist/` sont servis à la racine d'un hébergement statique. Pour une intégration sous un chemin tel que `/el-sanctuario/`, adapter ensemble les chemins des ressources, le manifeste, la portée et les URLs du service worker.

Ce paquet est indépendant de l'aperçu ChatGPT Sites : aucun identifiant de projet, jeton, configuration d'accès ou historique Git privé n'est inclus. Ne pas remplacer le site hôtelier existant avec cette maquette.

La publication sur GitHub ou Vercel n'est pas effectuée par la création de ce ZIP. Les instructions décrivent la reprise à réaliser dans Codex.

</details>
