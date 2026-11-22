# Réception phase 1 · 22 novembre 2026

Branche dédiée : `codex/el-sanctuario-v2`. Projet Vercel conservé : `olivier-steineur/el-sanctuario-21`. URL de preview : https://el-sanctuario-21.vercel.app/en/ ; version espagnole : https://el-sanctuario-21.vercel.app/es/.

## Réalisé et vérifié en local

- Revue rendue sur le serveur : couverture d’édition, numéro et période, sommaires, archives, rubriques, série du chef, recettes structurées, articles partageables et reprise de lecture. Les anciens liens restent valides.
- Univers Weddings et Special Moments avec articles complets et demandes suivies, contact autorisé pour une surprise et conservation du texte en cas d’erreur.
- Exploration hôtel/baie, plongée, pêche, yoga, gastronomie, spa, culture et événements ; filtres et vues liste/agenda. Les propositions sans prestataire ou créneau confirmé restent « sur demande ».
- Météo réelle, heure de Zihuatanejo, °C/°F, ressenti, min/max et fraîcheur. Une donnée ancienne conservée après une panne est explicitement datée ; aucune température n’est inventée.
- Comptes vérifiés et récupération d’accès avec Better Auth ; préférences privées et choix de partage des allergies, versionnement des mises à jour, carnet en PostgreSQL et import explicite du carnet de l’appareil sans doublons.
- Séjours passés, prochains séjours et projets de retour distincts ; import contrôlé par la réception, sans dépendre d’un accès PMS supposé.
- Demandes identifiées, états réels, réponses dans le même dossier et historique. Une confirmation exige une référence réelle.
- Cartes Gold/Platinum/Black attribuées sur le serveur, QR opaque de courte durée, révocation et scan réservé au personnel. Le scan ne crédite pas de points.
- Programme configurable et inactif par défaut ; opérations idempotentes, verrouillage du membre, registre et audit immuables, corrections et annulations traçables, expiration de points non dépensés lorsqu’elle est configurée.
- Rôles édition, réception, fidélité et administration. Le personnel publie articles, expériences, événements et éditions avec des formulaires, sans modifier le code.
- Offres et contrôle serveur des dates et de l’éligibilité. Les offres réservées et brouillons de la maison ne sont pas transmis au catalogue public ou au studio de démonstration.
- Offres officielles importées de `lacasaquecanta.com/savings2` : Discover Us, Enchanting Moments et Indulge Yourself, avec fiches EN/ES, photos, prestations, conditions, périodes de séjour et sources vérifiées le 22 novembre 2026. Les demandes restent soumises à confirmation et refusent les séjours hors période.
- PWA installable, EN/ES, téléphone/tablette, navigation clavier, caches éditoriaux séparés des données privées, secrets et base exclus des exports Git.

Les données de démonstration sont isolées par espace et signalées dans les interfaces. Les textes initiaux, l’archive d’exemple et les propositions d’expériences ne sont pas présentés comme des publications ou disponibilités commerciales approuvées.

## Ajouts vols, taxis et dîner

- Vols d’arrivée et de départ rattachés au séjour ou au projet : compagnie, numéro, date et heure locale à l’aéroport, aéroport et trajet. Il s’agit de la préparation de l’itinéraire fourni par le voyageur ; aucun billet d’avion n’est acheté ou réservé et aucun statut aérien en temps réel n’est inventé.
- Demandes de taxi ou transfert pour l’arrivée, le départ ou un autre trajet : lieu de prise en charge, destination, date, heure, personnes, bagages, numéro de vol et notes. Les états et réponses sont suivis dans le même dossier. La réception doit renseigner un prestataire et une référence pour confirmer. Modifier un vol ne modifie pas une demande de taxi déjà envoyée.
- Dossier personnel : vols et taxis appartiennent à la personne connectée, y compris quand plusieurs clients séjournent au même hôtel aux mêmes dates. Son nom est visible dans le dossier et la connexion au même compte retrouve ses données sur un autre appareil. Les contrôles sont effectués par le serveur.
- « Cena romántica en la playa » : page complète EN/ES et accès depuis l’accueil, l’exploration et Special Moments ; demande avec date, convives, heure locale souhaitée, occasion, alimentation et contact autorisé pour une surprise. L’emplacement de plage, ses permissions, la météo, le menu, les prix et le montage restent à confirmer par la maison. Aucun créneau ni tarif n’est déclaré disponible.

Les tests couvrent la persistance des vols, les conflits entre appareils, les demandes de taxi figées à l’envoi, la confirmation puis la révision par la réception, le jour du départ, les erreurs réseau et le dîner bilingue. La vérification distante se lance après déploiement avec `TEST_BASE_URL`.

## Vérifications reproductibles

```sh
npm run check
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Les tests d’intégration utilisent une vraie base PostgreSQL locale dédiée et refusent une base distante. Ils couvrent les droits, la confidentialité entre espaces, les conflits, l’import et la fusion, les requêtes concurrentes, les doubles crédits, les annulations, les QR révoqués, l’expiration, la publication et la vérification/récupération d’identité. Les envois d’e-mail sont substitués dans ces tests, sans destinataire réel.

Les parcours Firefox couvrent publication depuis le studio, lecture EN/ES, second appareil, préférences, demandes, réception, réseau en échec, scan manuel, déconnexion et formats mobile/tablette. Le parcours hors connexion s’exécute sur une compilation via `TEST_BASE_URL`. Une caméra physique et l’envoi réel d’un e-mail doivent être vérifiés sur les appareils et prestataires de l’hôtel après configuration.

## Activation encore nécessaire en ligne

**Neon est maintenant relié au projet Vercel.** Le déploiement de livraison prépare les tables avant compilation par la commande explicite ci-dessous ; les parcours distants se vérifient ensuite dans Firefox. Aucun stockage éphémère ou service concurrent n’a été substitué.

La revue publique reste consultable. La démonstration privée, la réception et la synchronisation utilisent cette base, avec le mode de démonstration et le secret de session configurés. **L’inscription et la récupération des comptes clients réels restent fermées**, car Resend et l’expéditeur vérifié manquent encore.

La migration distante se déclenche explicitement au déploiement :

```sh
vercel deploy --prod --yes --scope olivier-steineur --project el-sanctuario-21 --build-env SC_MIGRATE_ON_BUILD=true
```

Le script npm `prebuild` appelle `scripts/migrate-on-deploy.mjs`. Sans `SC_MIGRATE_ON_BUILD=true` fourni par cette commande, aucune migration n’est lancée par la compilation. Les secrets restent dans Vercel et ne sont pas copiés dans un fichier local.

Pour ouvrir les comptes réels : configurer l’expéditeur d’e-mail et son accès, désigner le premier administrateur, puis vérifier un parcours d’inscription réel. Le secret de session et le mode de démonstration sont préparés séparément par environnement.

L’identité du PMS et du CRM de l’hôtel reste inconnue. Le lien de réservation officiel est conservé ; l’adaptateur entrant signé et l’import contrôlé sont prêts. Le prestataire newsletter et son audience doivent être confirmés et configurés. Aucun email commercial, séjour réel, barème ou avantage hôtelier n’est inventé ou activé. Le détail des variables et des opérations est dans [DEVELOPMENT.md](DEVELOPMENT.md).

## Phase 2 uniquement

Applications iOS/Android distribuées dans les stores, passes Apple Wallet/Google Wallet et extensions natives. Les API et le même registre de points peuvent être réutilisés ; aucun abonnement mobile payant n’a été créé.

## Précision d’accès demandée après livraison

Olivier a demandé une connexion par Clerk pour les espaces personnels, commune aux appareils et futures applications. Clerk n’est pas installé : Vercel exige l’acceptation personnelle de ses conditions avant provisionnement. L’authentification de démonstration actuelle reste fonctionnelle. La connexion Clerk et l’authentification des applications mobiles ne sont pas déclarées réalisées ; elles nécessitent ce raccordement et leurs propres tests. La web app installable reste le périmètre présent ; une publication App Store/Google Play reste à confirmer.
