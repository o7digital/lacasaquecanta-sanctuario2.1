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
- PWA installable, EN/ES, téléphone/tablette, navigation clavier, caches éditoriaux séparés des données privées, secrets et base exclus des exports Git.

Les données de démonstration sont isolées par espace et signalées dans les interfaces. Les textes initiaux, l’archive d’exemple et les propositions d’expériences ne sont pas présentés comme des publications ou disponibilités commerciales approuvées.

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

La configuration Vercel contrôlée pendant cette livraison ne comporte pas de `DATABASE_URL`. La création de Neon a été tentée par la CLI ; Vercel exige une acceptation personnelle des conditions par le propriétaire. Le lien de validation fourni par la CLI s’est révélé inaccessible côté utilisateur ; la page officielle https://vercel.com/marketplace/neon a été fournie et ouverte dans Firefox. Aucun service de stockage concurrent ni stockage éphémère n’a été substitué.

En conséquence, la revue publique peut être déployée et consultée, mais **les comptes, la démonstration privée en ligne, la réception et la synchronisation distante restent en attente de cette base**. L’interface affiche cet état. Les mêmes fonctions sont réalisées et testées avec PostgreSQL en local ; elles ne sont pas déclarées connectées sur la preview tant que la base distante n’est pas prête.

Pour ouvrir les comptes réels : connecter/migrer la base, configurer un expéditeur d’e-mail vérifié et son accès, désigner le premier administrateur, puis vérifier un parcours d’inscription réel. Le secret de session et l’activation conditionnelle du mode de démonstration sont préparés dans Vercel, séparément par environnement.

L’identité du PMS et du CRM de l’hôtel reste inconnue. Le lien de réservation officiel est conservé ; l’adaptateur entrant signé et l’import contrôlé sont prêts. Le prestataire newsletter et son audience doivent être confirmés et configurés. Aucun email commercial, séjour réel, barème ou avantage hôtelier n’est inventé ou activé. Le détail des variables et des opérations est dans [DEVELOPMENT.md](DEVELOPMENT.md).

## Phase 2 uniquement

Applications iOS/Android distribuées dans les stores, passes Apple Wallet/Google Wallet et extensions natives. Les API et le même registre de points peuvent être réutilisés ; aucun abonnement mobile payant n’a été créé.
