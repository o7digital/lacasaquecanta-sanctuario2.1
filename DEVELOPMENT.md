# Développement et exploitation

## Sources

`src/templates/journal.html` et `src/styles/reference.css` reprennent le HTML/CSS du ZIP. `src/lib/presentation.ts` traduit le gabarit et y insère les articles/événements administrés, rendus côté serveur. `src/pages/[lang]/stories/[id].astro` fournit les articles partageables, métadonnées, hreflang et données structurées. `src/scripts/journal.ts` gère les interactions. `src/data/journal.json` contient articles, recettes, traductions, événements et statuts.

`public/assets/` conserve les photographies et polices du ZIP. Licences : `licenses/` ; provenance : `asset-sources.json`. **`dist/` et `El_Sanctuario.html` restent inchangés**, comme références du prototype initial, et ne sont pas publiés par ce déploiement. La sortie Astro est `build/`.

`scripts/import-prototype.mjs` documente la migration initiale ; ne pas le relancer sur une édition modifiée, car il réimporte les données du prototype. Les versions actuelles Astro/React/Vercel ont été vérifiées auprès de la [documentation Astro](https://docs.astro.build/en/guides/integrations-guide/vercel/), et sont verrouillées par `package-lock.json`.

## Administration éditoriale

Ouvrir `/admin/`. Utiliser un **jeton GitHub à permissions fines**, limité à `o7digital/lacasaquecanta-sanctuario2.1`, avec `Contents: read/write`. Le compte doit avoir le droit d'écrire. Le jeton est envoyé uniquement à l'API GitHub, demeure en mémoire dans l'onglet et n'est enregistré ni dans localStorage ni sur le serveur de la revue.

Le studio réutilise le mécanisme du projet Sanctuario précédent, exclusivement adapté au nouveau dépôt et à `codex/el-sanctuario`. Il gère articles/recettes, traductions EN/ES, crédit et descriptions des photos, téléversement, mise en avant, événements, annulation et suppression. Les articles passent par `draft`, `review`, `sample` ou `published`. Les brouillons et textes en révision sont exclus de la revue publique. Une prévisualisation nettoyée est disponible avant enregistrement. Les écritures utilisent le SHA du fichier pour refuser un écrasement concurrent.

**Le dépôt GitHub est public** : les brouillons ne sont pas confidentiels dans GitHub. Ne pas y mettre de données clients, de secrets ou de contenus confidentiels. La lecture de la revue reste libre, sans compte GitHub ou ChatGPT.

Les changements d'édition sont des commits GitHub sur `codex/el-sanctuario`. Le serveur relit cette branche avec un cache d'environ une minute ; le développement lit le fichier local. Après une modification dans le studio, faire `git pull --ff-only` avant de modifier les mêmes sources localement.

Les huit textes initiaux sont des **échantillons**, dont une recette dérivée de la proposition fournie. Ils ne sont pas attribués au chef comme des déclarations réelles. Valider textes et attribution avant publication commerciale. Les exemples sont exclus de la sitemap ; les aperçus restent `noindex`.

## Newsletter en attente de validation

À la demande d'Olivier du 22 novembre 2026, le formulaire annonce son attente d'activation, ne collecte pas d'adresses et n'affiche aucun faux succès. `/api/newsletter` refuse les inscriptions tant que `NEWSLETTER_ENABLED` n'est pas `true`.

L'adaptateur serveur Mailchimp est repris du projet existant : adresse, langue, intérêts, consentement explicite, piège à robots et contrôle d'origine. Il crée uniquement un contact `pending` pour confirmation par email. Un contact existant n'est ni modifié ni réabonné. Les erreurs sont remontées. La gestion des préférences et la désinscription renvoient au formulaire officiel de l'audience.

Pour l'activer plus tard, valider avec l'hôtel le service, l'audience, l'expéditeur, les textes de consentement et les intérêts. Configurer dans Vercel, jamais dans le dépôt :

```text
NEWSLETTER_ENABLED=true
MAILCHIMP_API_KEY
MAILCHIMP_AUDIENCE_ID
PUBLIC_NEWSLETTER_MANAGE_URL
```

Activer une limite de débit persistante au niveau de l'hébergement et tester avec une adresse contrôlée jusqu'à réception de la confirmation et désinscription. La protection en mémoire ne couvre que les rafales sur une instance ; ce n'est pas une limite distribuée. Les tests automatisés de l'adaptateur ne contactent pas Mailchimp et n'envoient aucun email.

L'inspection d'o7 Pulse/Olivia One n'a pas trouvé de contrat d'inscription publique avec double confirmation. Les routes d'envoi de campagnes existantes n'ont pas été présentées comme des routes d'inscription. Aucune production Pulse n'a été modifiée, aucun abonnement payant ajouté.

## Carnet, agenda et séjours

Le carnet conserve articles, recettes, événements, inspirations et dates/désirs de séjour **sur cet appareil**, sans compte. Les favoris du prototype restent compatibles. Export JSON et copie hors connexion des articles sauvegardés sont prévus. Il n'y a pas de synchronisation entre appareils ni d'avantages de fidélité inventés.

L'agenda présente source, lieu, catégorie, vérification et statut. Les événements passés sont archivés visuellement ; les annulations ne proposent plus de séjour. L'export ICS respecte la date de fin exclusive. Les festivals 2027 ont été revérifiés le 22 novembre 2026 auprès de leurs organisateurs : [Guitar Festival, 6–13 mars](https://www.zihuafest.com/) et [Sailfest, 14–27 février](https://www.zihuatanejo-sailfest.com/copy-of-home-1). Ils ne sont pas présentés comme organisés par l'hôtel.

Le séjour peut être conservé dans le carnet et repris. Le formulaire **prépare un email**, à envoyer par le lecteur depuis sa messagerie ; il ne transmet pas une demande automatiquement et ne confirme pas de réservation. Le lien hôtelier SynXis réutilise les identifiants du [site officiel](https://www.lacasaquecanta.com/) et les dates valides. Les villas renvoient vers leurs sites officiels, leurs identifiants de réservation n'étant pas validés ici.

## Météo et PWA

La météo réutilise Open-Meteo via `/api/weather`, avec délai maximal, cache de 15 minutes, contrôle de fraîcheur et erreur explicite sans valeurs inventées. Fuseau : `America/Mexico_City`. Source : [Open-Meteo](https://open-meteo.com/), données [CC BY 4.0](https://open-meteo.com/en/license), températures arrondies pour l'affichage. La prévisualisation utilise l'API d'évaluation ; avant exploitation commerciale, configurer une clé client existante `OPEN_METEO_API_KEY` ou le fournisseur validé par l'hôtel, selon les [conditions du fournisseur](https://open-meteo.com/en/pricing).

Le service worker utilise uniquement les caches `el-sanctuario-21-*`, préserve les caches des autres applications et exclut les API et l'administration. Les articles sauvegardés sont disponibles lorsque leur téléchargement est terminé. L'édition hors connexion indique son ancienneté ; la météo n'est jamais servie depuis ce cache. Notifications et applications natives iOS/Android ne sont pas livrées.

## Vérification et déploiement

Node.js 24 LTS. Les contrôles :

```sh
npm ci
npm run check
npm test
npm run test:e2e
npm run build
```

Les tests du studio simulent GitHub pour éviter des écritures éditoriales de test. Les tests d'intégration couvrent consentement, erreurs de fournisseur et absence de faux succès sans envoyer d'email. Les parcours Firefox vérifient EN/ES, lecture sans JavaScript, recherche, filtres, carnet persistant, agenda, séjours, mobile et autorisations d'écriture. Tester aussi le déploiement compilé et son mode hors connexion :

```sh
TEST_BASE_URL=https://el-sanctuario-21.vercel.app npm run test:e2e
```

Astro peut lancer le serveur local en arrière-plan : `npx astro dev status`, `npx astro dev logs`, `npx astro dev stop`. Les aperçus navigateur utilisent Firefox.

Le projet est `olivier-steineur/el-sanctuario-21` (`prj_R51X3spb8kne8bZok2ZACtPIlZgO`), distinct des sites hôteliers existants. Vérifier ce contexte avant toute mutation :

```sh
vercel project inspect --non-interactive
git push origin codex/el-sanctuario
vercel deploy --prod --yes
```

Le déploiement « production » appartient **au projet de prévisualisation distinct**, sans domaine hôtelier. Ne pas relier ce dossier aux projets La Casa Que Canta existants. `.env.example` décrit les variables sans secrets : `CONTENT_BRANCH` vaut par défaut `codex/el-sanctuario`, `PUBLIC_SITE_URL` fixe l'origine canonique, `PUBLIC_INDEXABLE` reste désactivé sur les aperçus. Les métadonnées sont générées par langue ; la sitemap contient uniquement les articles effectivement publiés et les accueils.
