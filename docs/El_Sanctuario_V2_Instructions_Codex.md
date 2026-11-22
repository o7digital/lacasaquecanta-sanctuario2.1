# El Sanctuario — Revue digitale et espace client

**Instructions de réalisation pour Codex · 22 novembre 2026**
Projet existant : https://el-sanctuario-21.vercel.app/en/
Maison : La Casa Que Canta · Zihuatanejo, Mexique.

Ce document remplace le périmètre fonctionnel des instructions précédentes. Il décrit les évolutions à réaliser ; il ne signifie pas que ces fonctions sont déjà développées ou déployées. Repartir du dépôt qui alimente l’URL ci-dessus. L’ancien ZIP contient un prototype antérieur : ne pas écraser les développements plus récents avec ses fichiers.

## 1. Mission

Faire d’El Sanctuario une véritable revue digitale de La Casa Que Canta, reliée à une web app personnelle pour ses lecteurs et les clients de l’hôtel. La revue entretient le lien entre deux séjours. L’espace client transforme cette envie de revenir en expériences préparées, réservations, reconnaissance et fidélité.

La phase 1 doit fonctionner sur ordinateur, téléphone et tablette, avec une web app installable. Les applications iOS et Android constituent une phase 2 optionnelle, fondée sur les mêmes comptes, contenus et données.

Le produit doit donner envie de lire : couverture, numéro, sommaire, dossiers, photographies, portraits, lettres et vrais articles. Les services personnels doivent rester faciles à retrouver sans envahir la lecture.

### Ce que montre la version consultée

La page anglaise a été récupérée le 22 novembre 2026. Elle présente une couverture, des articles avec leurs propres URL, une lettre du chef, un module météo, des événements, des liens vers les villas, un carnet annoncé comme enregistré sur cet appareil, un formulaire de préparation d’e-mail de séjour et une inscription newsletter annoncée comme en attente d’activation. Elle présente également un lien vers un studio éditorial.

Cette observation porte sur la page publique, pas sur un audit de son backend. Vérifier les fonctions réellement présentes dans le dépôt avant de les conserver, compléter ou remplacer. Ne pas refaire une fonction déjà opérationnelle.

## 2. Expérience et direction artistique

Conserver les signes de La Casa Que Canta : identité existante, photographies autorisées, atmosphère mexicaine, lumière du Pacifique, typographie éditoriale et élégance chaleureuse. Ne pas inventer un nouveau logo de l’hôtel. La lecture doit être agréable, avec de beaux blancs, de grandes images et une hiérarchie claire.

Créer une couverture pour chaque édition avec numéro, période, thème et dossier principal. Le magazine conserve des archives consultables. Un article peut appartenir à une édition et rester accessible par sa rubrique ou la recherche.

Séparer visuellement la couverture éditoriale et le bloc « Aujourd’hui dans la baie », dont les informations évoluent chaque jour. Éviter qu’une ancienne édition semble contenir une météo ou un programme actuels.

### Navigation proposée

Sur ordinateur : **La revue · À vivre · Offres · Mon espace**. Les rubriques du magazine restent accessibles dans le sommaire. Sur mobile : **Lire · Explorer · Mes séjours · Ma carte · Profil**. Traduire naturellement ces libellés en anglais et espagnol, sans mélanger les langues.

| Espace | Contenu principal | Accès |
| --- | --- | --- |
| La revue | Couverture, sommaire, rubriques, articles, archives, recherche | Public |
| Aujourd’hui / À vivre | Météo, programme hôtel et baie, activités, événements | Consultation publique |
| Offres | Séjours et expériences, conditions, périodes, accès anticipé éventuel | Public ou membre selon l’offre |
| Mes séjours | Historique, prochain séjour, souhaits et demandes | Client connecté |
| Ma carte | Gold, Platinum ou Black, QR, points et avantages validés | Client connecté |
| Profil | Goûts, préférences, alimentation, notifications | Client connecté |
| Administration | Édition, expériences, demandes, comptes, fidélité, scan | Personnel autorisé |

## 3. La revue : le cœur du produit

Prévoir des articles complets avec URL propre, titre, chapô, signature autorisée, date, temps de lecture, photographies et légendes. Ajouter la sauvegarde, le partage et la reprise de lecture. Une modale seule ne suffit pas pour lire tous les dossiers.

Rubriques initiales :

- **La vie de la maison** : actualités de l’hôtel, chambres et suites, jardins, architecture, équipes, services, villas et nouveautés réellement disponibles.
- **À la table du chef** : lettre du chef, conseils, recette, produit de saison, cuisine mexicaine, pêche du jour lorsqu’elle est confirmée, accords et rencontres.
- **La baie vivante** : découvertes, culture, artisans, sorties, mer et programme de Zihuatanejo.
- **Corps et esprit** : yoga, bien-être, spa et rituels disponibles.
- **Weddings** : mariages, cérémonies, lieux, idées et reportages autorisés.
- **Special Moments** : anniversaire, lune de miel, demande en mariage, anniversaire de mariage, séjour en couple et retrouvailles.
- **Agenda & Events** : événements de l’hôtel et de la baie, clairement identifiés.

La lettre du chef doit avoir sa propre série et ses archives. Une recette affiche ingrédients, étapes et portions. Les options alimentaires ne sont affichées que lorsqu’elles ont été validées. Les textes de démonstration restent signalés dans la preview et ne sont pas publiés comme les propos réels d’un chef.

Le CMS doit gérer les numéros, articles, catégories, auteurs, médias, traductions, brouillons, prévisualisation, publication et dépublication. Les dossiers Weddings et Special Moments sont de vraies pages éditoriales, pas deux cartes vides en bas de la page.

## 4. L’innovation : passer d’un article à son propre séjour

Chaque contenu pertinent peut proposer une action utile : **Garder pour plus tard**, **Ajouter à mon prochain séjour**, **Demander cette expérience** ou **Préparer mon retour**.

Exemple : une lectrice découvre une lettre sur un produit mexicain, sauvegarde le conseil du chef, souhaite une expérience gastronomique pour son prochain séjour et précise ses préférences alimentaires. L’hôtel reçoit une demande liée au séjour et répond dans le même dossier. La demande devient une activité confirmée uniquement après confirmation réelle.

Créer un **carnet de séjour** qui rassemble les articles, activités et moments souhaités. Les éléments d’inspiration restent distincts des réservations confirmées.

Personnaliser la sélection à partir d’informations explicitement choisies : gastronomie, mer, plongée, pêche, yoga, culture, romantisme, bien-être. Expliquer simplement pourquoi une suggestion apparaît. Un moteur de règles suffit pour la première version ; aucun système d’IA n’est nécessaire pour rendre ce parcours utile.

Adapter l’accueil personnel à la situation : avant le séjour, pendant le séjour et après le départ. Les visiteurs sans séjour à venir peuvent préparer un projet de retour.

## 5. Aujourd’hui à Zihuatanejo

Afficher la température réelle du jour, la condition météo, le ressenti si disponible, les températures minimale/maximale et l’heure locale. Ajouter la date et l’heure de la dernière actualisation. L’unité °C/°F doit pouvoir être choisie.

Conserver l’intégration météo existante si elle fonctionne. Prévoir une actualisation raisonnable, un état de chargement, une erreur compréhensible et un affichage « dernière donnée reçue » explicitement daté en cas de donnée ancienne. Ne jamais remplacer une panne par une température inventée.

Le module météo ne certifie pas la possibilité de plonger, pêcher ou naviguer. Les confirmations d’activité et annulations viennent du prestataire ou de l’hôtel.

Le programme du jour regroupe les activités de l’hôtel et les événements de la baie, avec lieu, heure locale et statut. Les dates passées ne doivent pas apparaître comme des événements à venir.

## 6. Activités, expériences et événements

Prévoir au minimum les catégories demandées : **plongée / buceo, pêche / pesca, yoga**, gastronomie, spa, sorties dans la baie et événements. L’existence d’une catégorie ne signifie pas qu’un prestataire ou un créneau est déjà confirmé.

Chaque fiche comprend :

- Lieu et contexte : dans l’hôtel ou dans la baie ; organisateur/prestataire identifié.
- Présentation, photos autorisées, durée, dates et horaires lorsque confirmés.
- Langues, niveau et conditions pratiques pertinentes.
- Prix, devise et inclusions lorsqu’ils sont connus ; sinon demande d’information.
- Conditions de réservation et d’annulation propres à cette offre.
- Disponibilité réelle ou mention claire « sur demande ».
- Action : consulter, demander une place, réserver via le prestataire ou ajouter au carnet.

Filtres : hôtel/baie, date, catégorie et pertinence pour le prochain séjour. Proposer un affichage liste et agenda. Permettre l’ajout au calendrier avec un fuseau correct.

Les demandes ont un état réel : brouillon, envoyée, en attente, confirmée, refusée ou annulée. Un clic sur « demander » ne crée pas une réservation confirmée. Prévoir la réponse du personnel et l’historique des changements.

Les événements externes portent leur source et leur date de vérification. Les événements de l’hôtel sont administrés par l’équipe. Ne pas inventer un calendrier d’animations pour remplir la page.

## 7. Compte client et préférences

Permettre la lecture sans compte. La connexion ouvre les fonctions privées : carte, points, séjours, préférences, demandes et carnet synchronisé. Réutiliser le système d’authentification présent s’il convient ; sinon prévoir une connexion simple, avec vérification de l’identité et récupération d’accès.

Le profil comprend :

- Nom, prénom, coordonnées utiles et langue de communication.
- **Ce que j’aime** : centres d’intérêt, envies, préférences de séjour.
- **Ce que je n’aime pas / préfère éviter** : choix et commentaire libre.
- **Alimentation** : gluten-free, végétarien, vegan et autres préférences configurables.
- **Allergies et intolérances** : champ distinct des goûts, avec niveau de partage choisi et date de mise à jour.
- Préférences pratiques : chambre, oreillers, rythme du séjour ou autres éléments réellement pris en charge par la maison.
- Moments à célébrer, si le client souhaite les partager.
- Newsletter et notifications : choix séparés par thème et canal.

Les champs alimentaires sont facultatifs, modifiables et supprimables. Ne pas déduire une allergie d’un article lu ou d’un plat aimé. L’hôtel doit pouvoir distinguer « préférence transmise » et « demande prise en compte », sans promettre automatiquement une prestation alimentaire.

Limiter l’accès des employés aux informations utiles à leur rôle. Aucune donnée alimentaire ni historique personnel ne figure dans un QR public. Les préférences ne sont pas visibles des autres clients.

Le carnet existant enregistré sur l’appareil peut être importé dans le compte avec une action explicite et une fusion sans doublons. Tant que la synchronisation n’est pas effective, l’interface doit l’indiquer.

## 8. Mes visites et mes prochains séjours

Afficher deux ensembles clairs : **Mes séjours passés** et **Mes prochains séjours**. Prévoir aussi un projet de séjour sans réservation pour préparer son retour.

Pour chaque séjour réel : établissement, dates, référence, statut, prestations disponibles, demandes associées et activité de fidélité correspondante. Le prochain séjour ouvre son carnet, ses expériences, ses offres applicables et les préférences à transmettre.

L’historique de visites doit provenir d’une source de l’hôtel ou d’une validation par son personnel. Une déclaration libre du client ne crédite pas automatiquement des points. Prévoir un import contrôlé si l’intégration PMS n’est pas encore disponible, avec origine et date d’import.

Identifier dans le dépôt et la configuration le PMS, CRM et moteur de réservation réellement utilisés. La présence d’un lien vers SynXis ne prouve pas que l’on dispose d’une API donnant accès aux réservations. Ne pas attribuer à cet hôtel un fournisseur utilisé sur un autre projet.

Conserver le lien de réservation officiel opérationnel pendant la mise en place. Pour une réservation anticipée, relier le parcours à la disponibilité réelle ou à une demande traitée par l’hôtel. Distinguer demande, option éventuelle et réservation confirmée.

## 9. Carte de fidélité : Gold, Platinum, Black

Créer **El Sanctuario Circle**, nom de travail du programme, avec trois niveaux : **Gold, Platinum, Black**. Le nom commercial peut être modifié sans refonte.

La carte numérique affiche le nom du membre, son identifiant, son niveau attribué, son QR, ses points disponibles et les avantages réellement activés. Prévoir trois traitements visuels élégants, lisibles et distincts. Le client ne choisit pas librement son niveau.

La page fidélité présente le détail des mouvements de points : date, motif, séjour ou expérience associé, points gagnés/utilisés/annulés/expirés et solde. La progression vers le niveau suivant n’est affichée que si une règle réelle est configurée.

### Deux usages du QR

1. **QR d’adhésion**, affiché à la réception ou dans les supports : ouvre une page d’inscription. Après vérification du compte et application des règles du programme, le client retrouve sa carte.
2. **QR personnel de la carte** : présenté par le client, scanné depuis l’espace du personnel autorisé pour retrouver le membre, vérifier son statut et traiter une opération autorisée.

Le QR personnel contient un jeton opaque révocable ou de courte durée, jamais des coordonnées, préférences, points ou données de paiement lisibles. Le scan par un utilisateur non connecté au personnel ne révèle pas le profil. Prévoir une saisie manuelle sécurisée si la caméra est indisponible.

Un scan identifie un membre ; il ne constitue pas, à lui seul, une preuve de séjour ou de dépense. Les points sont calculés côté serveur à partir d’un événement validé et d’un barème configuré. Le registre doit résister aux doubles scans, doubles clics et notifications répétées du PMS. Une correction crée une écriture traçable, sans effacer l’historique.

Rendre configurables depuis l’administration : critères des trois niveaux, opérations éligibles, barème, avantages, validité, expiration éventuelle et règles d’annulation. **Ne pas inventer des seuils, remises, cadeaux, droits prioritaires ou équivalences monétaires.** La structure peut être construite et testée avec des données de démonstration isolées ; l’activation commerciale utilise les règles de l’hôtel.

## 10. Offres et préparation du retour

Les offres ont une page propre avec contenu, période de réservation, période de séjour, conditions, exclusions, devise et lien ou parcours de demande. Le statut de membre peut ouvrir une offre réservée ou une période de réservation anticipée uniquement lorsque l’hôtel l’a configurée.

Une offre peut être reliée à un article, une expérience, un événement ou une célébration. Ajouter « Préparer mon retour » et permettre d’enregistrer l’offre dans le projet de séjour.

Ne pas afficher de fausse rareté, de prix barrés fictifs ou d’avantage hôtelier non confirmé. Ne pas déduire une disponibilité de chambre de l’existence d’une offre.

## 11. Weddings et Special Moments

Créer deux univers avec contenu et parcours dédiés, accessibles depuis la revue et liés aux séjours.

**Weddings** : inspirations, espaces réellement proposés, possibilités de privatisation confirmées, gastronomie, hébergement et reportages autorisés. Formulaire : dates souhaitées et flexibilité, nombre de personnes, type de cérémonie ou réception, hébergement éventuel, message et coordonnées. Budget facultatif si l’équipe souhaite ce champ.

**Special Moments** : anniversaire, lune de miel, demande en mariage, anniversaire de mariage et autres occasions. Permettre de préciser date, nombre de personnes, envies, préférences alimentaires pertinentes et caractère surprise. Une demande « surprise » doit permettre de choisir le contact autorisé et ne pas notifier automatiquement l’autre voyageur.

Les formulaires créent des demandes suivies par l’hôtel. Afficher un accusé de réception seulement après enregistrement réussi. Garder les textes saisis et proposer une alternative en cas d’erreur. Ne pas présenter une demande envoyée comme un événement réservé.

## 12. Newsletter et relation client

Mettre en service une inscription réelle reliée au prestataire ou CRM existant après identification de son intégration. Enregistrer la langue et les thèmes choisis : lettre du chef, revue, activités, événements, offres, weddings et moments spéciaux.

Gérer confirmation selon le prestataire, désinscription, préférences et erreurs. Le compte membre ne vaut pas consentement automatique aux communications commerciales. Les messages utiles à une demande ou réservation doivent rester distincts des campagnes éditoriales.

L’accès anticipé aux nouvelles offres, si activé, dépend des règles de l’offre et du programme. Les campagnes peuvent cibler des intérêts déclarés ; ne pas exposer les données alimentaires dans des exports marketing ordinaires.

## 13. Administration de la maison

Prévoir des rôles et des écrans adaptés :

| Rôle | Fonctions principales |
| --- | --- |
| Édition | Numéros, articles, médias, traductions, événements et offres éditoriales |
| Réception / conciergerie | Séjours, demandes, préférences pertinentes, scan des cartes |
| Fidélité | Règles, niveaux, écritures autorisées et corrections justifiées |
| Administration | Comptes du personnel, autorisations, intégrations et configuration |

Prévoir un tableau de suivi des demandes, les réponses au client et les statuts. La mise à jour du site doit être réalisable par l’hôtel sans modifier du code. Journaliser les changements de réservations importées, de niveaux et de points.

## 14. Mise en œuvre technique

Commencer par identifier le dépôt et la branche réellement associés à `el-sanctuario-21.vercel.app`. Lire ses instructions, examiner les changements en cours, son CMS, ses API, ses tests et ses intégrations. Le HTML consulté charge des ressources Astro : vérifier la structure du dépôt et conserver la stack existante lorsque possible.

Travailler sur une branche dédiée à cette évolution. Conserver les traductions EN/ES, les liens d’articles existants et les composants déjà utiles. Prévoir des redirections si une URL change. Les noms de routes ci-dessous sont conceptuels et doivent s’adapter au routeur existant.

Routes publiques : édition, archives, rubrique, article, expérience, événement, offre, weddings, special moments. Routes privées : profil, séjours, séjour individuel, carte, points, carnet, demandes. Routes du personnel : édition, clients, demandes, programme de fidélité et scan.

### Données à organiser

| Domaine | Entités nécessaires |
| --- | --- |
| Éditorial | Edition, Article, Category, Author, Media, Translation |
| Expériences | Experience, Event, Provider, Schedule, ExperienceRequest |
| Clients | Guest, Account, Preference, DietaryPreference, Consent |
| Séjours | Stay, StayImport, StayPlan, SavedItem, ServiceRequest |
| Fidélité | Membership, TierRule, Benefit, PointsTransaction, CardToken |
| Commercial | Offer, OfferEligibility, CelebrationRequest, NewsletterPreference |
| Exploitation | StaffRole, IntegrationStatus, AuditEntry |

Adapter ces entités au modèle existant ; ne pas créer un deuxième système concurrent. Les données privées sont persistées dans une base avec contrôle d’accès côté serveur. Chaque client ne lit et ne modifie que ses données autorisées. L’interface ne doit jamais pouvoir fixer elle-même un solde, un niveau ou une réservation confirmée.

Les adaptateurs PMS/CRM, météo, newsletter et réservation sont isolés afin de pouvoir remplacer un fournisseur. Aucun secret dans le navigateur, le dépôt ou le ZIP. Documenter les variables nécessaires avec des valeurs d’exemple non sensibles.

La couche API doit être réutilisable par les futures applications mobiles. Les opérations de points, réservations et demandes importantes doivent être idempotentes et traçables. Traiter les erreurs de réseau et les conflits, sans succès fictif.

### Web app et PWA

Responsive sur ordinateur, tablette, iPhone et Android. Navigation utilisable au clavier, contrastes suffisants, texte lisible, formulaires correctement étiquetés, états vides et erreurs soignés.

Prévoir manifeste, icônes, installation et consultation hors ligne des contenus éditoriaux sélectionnés. Une action nécessitant le serveur doit indiquer qu’elle n’a pas encore été envoyée si l’appareil est hors ligne. Ne pas conserver les pages privées, préférences, points ou réponses authentifiées dans un cache public partagé. Le service worker ne doit nettoyer que ses propres caches et respecter le périmètre de cette application.

Publications : métadonnées propres à chaque article, canonical, langues et sitemap. La preview peut rester non indexable ; la configuration du domaine de production doit être explicite, sans supprimer aveuglément le `noindex` de l’environnement de test.

## 15. Phase 2 : applications iOS et Android, optionnelles

Préparer dès la phase 1 une base commune de comptes, contenu, réservations et fidélité. La PWA fonctionne déjà sur les téléphones ; elle ne doit pas être présentée comme une application publiée sur l’App Store ou Google Play.

La phase 2 pourra ajouter : applications distribuées dans les stores, notifications choisies par le client, accès rapide à la carte et aux séjours, meilleure lecture hors ligne, liens profonds vers les articles et, si retenu, cartes Apple Wallet / Google Wallet. Ces passes sont distincts des applications natives et nécessitent leur propre intégration.

Choisir l’approche mobile après l’audit de la phase 1 et des fonctionnalités natives nécessaires. Réutiliser les mêmes API et le même registre de points. Aucun développement ou abonnement mobile payant n’est nécessaire pour livrer la première phase web.

## 16. Ordre de réalisation et critères de réception

1. **Audit ciblé et structure produit** : identifier la source déployée, conserver les fonctions existantes, créer le modèle d’éditions et les routes.
2. **Revue complète et exploration** : couverture, archives, rubriques, lecture, chef, weddings, special moments, hôtel/baie, météo et agenda.
3. **Comptes et espace personnel** : authentification, préférences, carnet synchronisé, historique et projets de séjour.
4. **Fidélité et réception** : trois cartes, adhésion, scan personnel, règles configurables et registre de points.
5. **Opérations réelles** : demandes d’expériences et célébrations, offres, réservation/PMS, newsletter et administration.
6. **Validation et preview** : parcours testés, données de démonstration séparées, documentation, code exportable et lien fourni directement dans le chat.

Les fonctions qui dépendent d’identifiants externes manquants doivent avoir leur interface et adaptateur prêts, avec une liste précise des informations manquantes. Elles ne sont pas déclarées opérationnelles tant qu’un parcours complet n’a pas été vérifié. Continuer les autres développements indépendants.

### Parcours à vérifier

- Un visiteur ouvre un numéro, consulte son sommaire, lit un article entier, retrouve une ancienne édition et partage un lien valide.
- Un membre sauvegarde un article, se reconnecte sur un autre appareil et retrouve son carnet.
- Il modifie ses goûts, ce qu’il évite et sa préférence gluten-free ; les modifications persistent et restent privées.
- Il distingue ses séjours passés, son prochain séjour confirmé et un simple projet de retour.
- Il trouve plongée, pêche et yoga, filtre hôtel/baie, puis ajoute une activité au projet de séjour.
- Une demande reçoit un vrai identifiant ; son statut change après traitement, sans fausse confirmation en cas d’échec réseau.
- Une carte Gold, Platinum ou Black reflète le niveau attribué par le serveur ; modifier le navigateur ne change pas les droits.
- Le personnel autorisé scanne une carte. Une personne non autorisée n’obtient pas le profil. Un jeton révoqué est refusé.
- Un double scan ou une notification répétée ne crédite pas deux fois la même opération ; une annulation produit une écriture cohérente.
- Les règles de points et avantages non configurées n’affichent pas de fausses promesses commerciales.
- Une offre expirée ou non éligible ne peut pas être présentée comme utilisable par le client.
- Une demande wedding ou special moment apparaît dans l’administration ; le choix de contact pour une surprise est respecté.
- La météo indique sa fraîcheur ; une panne ne produit ni nombre fictif ni page vide.
- EN/ES, mobile, installation PWA, déconnexion, contrôle d’accès entre deux comptes et confidentialité des caches sont vérifiés.
- L’éditeur peut publier un article, une expérience et un événement sans intervenir dans le code.

## 17. Livrables attendus de Codex

Livrer le code complet dans le dépôt existant, migrations et configuration d’exemple, documentation des intégrations, tests pertinents, accès documenté au mode de démonstration isolé, et une preview web utilisable.

Rendre un état factuel : réalisé et testé ; réalisable avec la configuration encore manquante ; prévu uniquement en phase 2. Inclure les commandes de démarrage/build/test, les règles éditoriales et un guide court de l’administration.

Présenter le lien de preview directement dans le chat. Le lecteur public doit pouvoir ouvrir la revue sans compte ChatGPT ; l’accès aux données personnelles nécessite seulement son compte client El Sanctuario. Ne pas déclarer le site livré si seule une maquette ou une liste de tâches existe.

## Message de démarrage à copier dans Codex

```text
Reprends le dépôt qui alimente https://el-sanctuario-21.vercel.app/en/.
Lis El_Sanctuario_V2_Instructions_Codex.md : ce document remplace le périmètre
fonctionnel précédent. Conserve les développements récents utiles.

Construis une véritable revue digitale avec éditions, sommaires, rubriques,
archives et articles, reliée à un espace client La Casa Que Canta :
activités dans l’hôtel et dans la baie, météo réelle, plongée, pêche, yoga,
lettres et conseils du chef, weddings, special moments, événements et offres.
Ajoute mes séjours passés et futurs, mes goûts et préférences alimentaires,
ainsi que les cartes Gold / Platinum / Black, le QR et les points côté serveur.
Prévois l’administration de l’hôtel et un vrai suivi des demandes.

Phase 1 : web app responsive et PWA. Phase 2 optionnelle : iOS et Android
sur les mêmes comptes et API. Ne présente pas une simulation comme un service
connecté. Ne crée aucun barème, avantage, événement ou disponibilité fictif.

Travaille sur une branche dédiée, réalise et teste les parcours du document,
continue les tâches indépendantes si une intégration manque de configuration,
puis livre une preview avec le lien directement dans le chat, le code et un
état précis des fonctions opérationnelles et des connexions restant à activer.
```
