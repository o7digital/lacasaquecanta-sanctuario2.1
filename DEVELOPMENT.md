# Exploitation d’El Sanctuario V2

Le cahier des charges V2 conservé dans `docs/` remplace le périmètre précédent. Les URL des articles, les photographies, les traductions, le lien de réservation officiel, le carnet local et la PWA sont conservés.

## Installation

```sh
npm ci
npm run setup:local
npm run db:local
npm run db:migrate
npm run dev
```

Node.js 24 LTS. `setup:local` complète `.env.local` sans écraser ses valeurs, génère un secret aléatoire et limite les droits du fichier. `db:local` utilise `compose.yaml`, avec PostgreSQL sur `127.0.0.1:5543`. Le mot de passe de cet exemple Docker est exclusivement local. Avec PostgreSQL installé autrement, créer `sanctuario_v2`, configurer `DATABASE_URL`, puis migrer.

Astro peut démarrer en arrière-plan : `npx astro dev status`, `npx astro dev logs`, `npx astro dev stop`. Ouvrir les URL dans Firefox.

## Sources et données

Astro rend les pages publiques ; React gère les espaces privés. `src/data/journal.json` demeure l’édition initiale exportable. `contentSchema` valide ensemble articles, événements, éditions, expériences et offres. Lorsqu’une édition de la maison existe dans `sc_editorial`, elle devient la source active du même modèle, relue immédiatement par les pages publiques. Une version empêche l’écrasement d’un autre éditeur.

En cas de panne de base, la copie éditoriale embarquée reste lisible ; les écritures privées échouent explicitement. `/admin/legacy/` conserve l’ancien studio GitHub pour la reprise des sources, sans remplacer une édition déjà enregistrée en base.

`migrations/001-circle.sql` décrit les tables applicatives. Les tables d’identité et de limitation d’accès sont générées par les migrations de Better Auth, verrouillé dans `package-lock.json`. `npm run db:migrate` exécute les deux. Aucune migration ne s’exécute implicitement pendant une visite ou une compilation.

Les photos téléversées par un éditeur sont conservées dans `sc_media`, limitées à 3 Mo et servies avec type d’image et `nosniff`. Les images de la maison sont publiques ; les médias de démonstration restent limités à leur espace. Ne téléverser que des médias autorisés à la publication.

## Comptes réels

Variables serveur : `DATABASE_URL`, `BETTER_AUTH_SECRET` (au moins 32 caractères aléatoires), `RESEND_API_KEY`, `AUTH_EMAIL_FROM` et, pour le premier administrateur, `STAFF_BOOTSTRAP_EMAIL`.

L’expéditeur doit être vérifié chez le prestataire d’e-mail. Les inscriptions et la récupération restent fermées tant que ce prestataire manque. Better Auth assure vérification de l’adresse, sessions en base, cookies HttpOnly, contrôle d’origine et limitation des tentatives. Une erreur du prestataire ne devient pas une annonce d’e-mail envoyé.

Le premier administrateur doit vérifier sa propre adresse. Son attribution initiale est refusée si un administrateur existe déjà. Retirer ensuite `STAFF_BOOTSTRAP_EMAIL` et gérer les rôles dans le studio. Aucun client ne peut s’attribuer un rôle, un niveau, un solde ou un séjour confirmé.

Les e-mails de vérification/récupération sont testés avec un prestataire substitué dans les tests locaux uniquement, sans envoi réel. Vérifier une livraison réelle après configuration. Un compte ne vaut pas consentement marketing.

## Démonstration isolée

Activer `DEMO_ENABLED=true` avec une base migrée et le secret d’identité. Sur `/en/login/` ou `/es/login/`, choisir le parcours client ou personnel.

Chaque nouveau navigateur reçoit un espace privé `demo:<uuid>`, trois identités fictives, des cartes Gold/Platinum/Black, un séjour passé, un prochain séjour fictif et un crédit de test. Les seuils et les 100 points sont des fixtures sans valeur commerciale. La bascule client/réception n’agit que dans cet espace et ne donne aucun accès aux données de la maison ou d’un autre espace. Le cookie de démonstration est opaque et HttpOnly. Les espaces expirent après sept jours. N’y saisir aucune information personnelle réelle.

Le carnet est réellement enregistré dans PostgreSQL. Le test Firefox ouvre un second contexte et y reconnecte le même compte de démonstration ; il ne simule pas la synchronisation avec localStorage.

## Guide court du studio

| Rôle | Écrans autorisés |
| --- | --- |
| Édition | Articles, recettes, événements, éditions et sommaires, expériences, offres et photos |
| Réception / conciergerie | Clients, préférences partagées, séjours, demandes, réponses et scan |
| Fidélité | Règles, niveaux, opérations, corrections et scan |
| Administration | Tous les écrans, permissions et audit |

**Édition.** Compléter les deux langues, signature, sources, descriptions et crédits, choisir le statut puis sauvegarder. Les brouillons et textes en révision restent hors de la revue. Les échantillons sont signalés et exclus de la sitemap. Les éditions ont leur sommaire ; expériences et offres ont leurs formulaires. Le personnel doit renseigner les conditions commerciales approuvées.

**Demandes.** Ouvrir la demande enregistrée, lire les souhaits et le contact autorisé, répondre et choisir l’état suivant. Confirmer exige une référence réelle. Les réponses sont visibles dans le même dossier du compte client. Aucun envoi d’e-mail de conciergerie n’est annoncé. Une surprise ne notifie pas automatiquement l’autre voyageur. Les textes restent dans le formulaire en cas d’échec.

**Séjours.** Choisir le compte vérifié, l’établissement, les dates, le statut, la référence et la source réellement consultée. L’import est daté et journalisé. Une référence et une source identiques ne créent pas plusieurs séjours. Un projet du lecteur ne devient ni réservation ni crédit de points.

**Fidélité.** Le programme de la maison est inactif par défaut, sans seuil ni avantage. Renseigner nom, critères Gold/Platinum/Black, opérations, points, conditions et avantages avant activation. Attribuer un niveau exige un rôle autorisé et une justification.

Les points sont calculés sur le serveur à partir d’une règle et d’un événement validé : séjour terminé importé, expérience confirmée ou référence de échange vérifiée. Le serveur verrouille le membre et impose un identifiant d’événement unique. Un scan ne crédite rien. Les corrections et annulations ajoutent des écritures opposées. Les tables de points et d’audit refusent mise à jour et suppression.

Une durée de validité configurée concerne les nouveaux crédits ; l’expiration ne retire que la part non dépensée et non déjà annulée. Une nouvelle règle ne modifie pas les anciennes écritures. Les soldes proviennent du registre, jamais du navigateur.

**Scan.** Le QR d’adhésion ouvre `/en/join/`. Le QR personnel contient un jeton aléatoire valable dix minutes et révocable, sans préférence ni coordonnée. La caméra se lance sur action du personnel ; une saisie manuelle est disponible. Un code non autorisé, expiré, révoqué ou provenant d’un autre espace ne retourne pas le profil.

## Confidentialité et PWA

Chaque session est reliée sur le serveur à son utilisateur et à son espace. Les champs alimentaires sont distincts des goûts, facultatifs, modifiables et supprimables. « Only me » exclut les allergies de la réponse à la réception. Le rôle fidélité ne reçoit pas le profil alimentaire. L’accusé de lecture ne garantit aucune prestation alimentaire.

Les comptes, API et pages du personnel utilisent `private, no-store`. Le service worker admet seulement les pages éditoriales prévues et les ressources publiques. Il ne cache ni compte ni API ni réponse privée, et ne nettoie que `el-sanctuario-21-*`. Les formulaires indiquent qu’une action n’a pas été envoyée hors connexion. Le carnet local est importé par action explicite, sans doublons.

Secrets, base locale, traces Firefox, dépendances et compilation sont exclus du dépôt et du téléversement Vercel. L’export Git du code ne contient aucune donnée de la base.

## Intégrations à activer

| Service | Présent | Encore nécessaire |
| --- | --- | --- |
| Base privée | PostgreSQL, migrations et parcours locaux réels | Création/connexion de Neon dans Vercel ; acceptation des conditions par le propriétaire |
| Identité | Vérification et récupération testées localement | Clé Resend, expéditeur vérifié, premier administrateur et livraison réelle vérifiée |
| Réservations | Lien officiel SynXis, import contrôlé, adaptateur entrant signé | Nom du PMS réel, contrat d’API, accès et correspondance des comptes |
| CRM | Interface isolée et erreur explicite sans connexion | Fournisseur réel et contrat d’échange |
| Newsletter | Adaptateur Mailchimp, langue, thèmes et double confirmation | Confirmation du fournisseur de l’hôtel, clé, audience et URL de préférences/désinscription |
| Météo | Open-Meteo, unités, heure locale, fraîcheur et erreur explicite | Pour l’exploitation commerciale : fournisseur ou clé validé par l’hôtel |
| Circle | Registre, rôles, cartes et scan | Barèmes, critères, avantages et conditions approuvés |

Aucun fournisseur PMS ou CRM n’a pu être identifié dans ce dépôt. Le lien SynXis n’accorde pas d’accès aux réservations. Mailchimp est un adaptateur conservé, pas la preuve d’un compte hôtelier connecté.

### Séjours entrants

`POST /api/integrations/stays` reste fermé sans `INBOUND_STAY_SECRET`, `INBOUND_STAY_ACTOR_ID` et `INBOUND_STAY_SOURCE`. Le compte de service doit appartenir au personnel de la maison. Envoyer le JSON défini par `HotelReservation` avec `x-sc-timestamp` (secondes Unix) et `x-sc-signature` : HMAC-SHA256 du texte `timestamp + "." + corps_JSON_exact`, en hexadécimal. La signature expire après cinq minutes.

Le client doit correspondre à une adresse vérifiée. `INBOUND_STAY_OPERATION`, facultatif, désigne une règle de crédit des séjours terminés ; le compte de service doit alors aussi avoir le rôle fidélité. Références et crédits sont idempotents. Aucun flux PMS réel n’est revendiqué.

### Newsletter

Après confirmation d’un compte Mailchimp par l’hôtel : `NEWSLETTER_ENABLED=true`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `PUBLIC_NEWSLETTER_MANAGE_URL`. Seul un contact `pending` est créé avec langue et thèmes. Un contact existant n’est ni réabonné ni modifié silencieusement. Vérifier confirmation, préférences et désinscription avec une adresse contrôlée. Les choix du profil ne deviennent pas automatiquement un abonnement confirmé.

## Vérification et publication

```sh
npm run check
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Les tests d’intégration refusent une base distante et ne contactent aucun destinataire réel. Le test hors connexion nécessite un déploiement compilé avec `TEST_BASE_URL`. La caméra nécessite un appareil réel et son autorisation ; saisie manuelle et contrôles serveur sont automatisés dans Firefox.

```sh
vercel project inspect --non-interactive
git push -u origin codex/el-sanctuario-v2
vercel deploy --prod --yes --scope olivier-steineur --project el-sanctuario-21
```

Projet indépendant : `olivier-steineur/el-sanctuario-21`, ID `prj_R51X3spb8kne8bZok2ZACtPIlZgO`. Il ne remplace pas le site hôtelier. `PUBLIC_SITE_URL` fixe l’origine canonique et `PUBLIC_INDEXABLE` reste faux pour la preview. Utiliser des bases et secrets distincts pour un futur domaine commercial. Migrer explicitement la base cible avant ouverture des comptes.

Applications iOS/Android, Apple Wallet/Google Wallet et diffusion dans les stores restent en phase 2. La phase 1 fournit la PWA et des API réutilisables.
