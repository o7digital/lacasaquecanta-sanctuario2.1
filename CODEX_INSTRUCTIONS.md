# Instructions Codex — El Sanctuario

## Mission

Développer une revue digitale premium pour La Casa Que Canta, à partir du code contenu dans ce dossier. Le nom est exactement « El Sanctuario ».

La revue entretient le lien avec les clients entre deux séjours : nouvelles de l'hôtel, gastronomie, vie de Zihuatanejo, météo, lectures et envies personnelles, puis préparation d'un retour et réservation à l'avance.

La gastronomie est un pilier : « La lettre du chef » doit être un rendez-vous éditorial fort. Le web desktop et mobile est prioritaire. Les applications natives iOS et Android restent une option ultérieure.

## 1. Reprendre cette version

- Lire `README.md`, `ETAT_FONCTIONNEL.md`, puis les sources de `dist/`.
- Lancer la maquette et comprendre les interactions avant toute refonte technique.
- Utiliser `El_Sanctuario.html` comme aperçu autonome et référence visuelle. Travailler sur les fichiers séparés de `dist/` pour le développement.
- Ne pas reprendre une ancienne maquette Sanctuary/Sanctuario et ne pas reconstruire un site générique à partir du seul nom de l'hôtel.
- Retrouver le dépôt pertinent parmi les projets La Casa Que Canta / El Sanctuario. Vérifier son contenu avant d'y travailler. Préserver les modifications existantes et créer une branche dédiée.
- Si aucun dépôt approprié n'existe, préparer un projet distinct. Ne pas remplacer le site de l'hôtel en production.
- Conserver les photographies officielles et l'identité de l'hôtel. Le petit soleil dessiné dans cette maquette est un motif de proposition, pas un nouveau logo officiel à imposer.

## 2. Direction visuelle

Préserver et affiner la nouvelle direction : grandes photographies, typographie éditoriale, vert profond, ivoire et touches terre cuite, compositions variées et lecture confortable.

Conserver la couverture selon l'heure de Zihuatanejo, avec trois ambiances et sélection manuelle. Respecter les préférences de réduction des mouvements.

L'expérience doit être soignée sur ordinateur, tablette et téléphone : tailles de caractères lisibles, contrastes, navigation au clavier, dialogues accessibles, interactions tactiles, absence de débordement horizontal général.

L'innovation repose sur l'usage : conserver une recette, retrouver une lecture, choisir un événement et préparer un séjour autour de ses envies.

## 3. Architecture

Le ZIP contient du HTML/CSS/JavaScript sans compilation. Ce n'est pas encore une application Astro/React.

Si le dépôt existant est adapté, conserver son architecture. Sinon, utiliser Astro + React + TypeScript : pages et articles rendus côté serveur ou générés statiquement, composants interactifs ciblés. Vérifier les versions et les recommandations officielles lors de l'installation.

Séparer les composants, les données éditoriales, la traduction, les intégrations et les styles. Éviter une réécriture qui modifie involontairement le design.

Prévoir des URLs propres pour chaque article et chaque langue, des métadonnées SEO, des liens canoniques et hreflang, une sitemap et des données structurées adaptées aux contenus réels.

## 4. Rubriques et lettre du chef

Prévoir :
- La lettre du chef.
- Gastronomie et Mar y Cielo.
- Produits, producteurs, gestes et saveurs du Mexique.
- Recettes à conserver.
- Vie de l'hôtel et nouvelles de la maison.
- Suites, El Ensueño et El Murmullo.
- Spa, bien-être et rituels.
- Zihuatanejo : culture, rencontres, sorties et événements.
- Inspirations pour un prochain séjour.

La lettre du chef doit associer un ingrédient, l'histoire d'un plat, les coulisses de la cuisine, une recette et une invitation à découvrir le restaurant.

Chaque article aura sa propre URL partageable, titre, introduction, auteur réel ou attribution éditoriale correcte, dates de publication/mise à jour, catégorie, images, temps de lecture et contenus liés.

Les textes actuels sont des exemples. Ne pas les attribuer au chef comme s'il les avait écrits. Ne pas inventer de noms, citations, interviews, recettes officielles, prestations, événements ou tarifs. Garder les indications de démonstration jusqu'à validation éditoriale.

## 5. Administration éditoriale

Réutiliser un CMS ou une administration existante si disponible. Prévoir la gestion des articles, recettes, photos, traductions, brouillons, prévisualisations, validations, mises en avant et événements.

Protéger les fonctions d'administration et les opérations d'écriture. La revue publique doit se lire sans connexion. Les secrets restent côté serveur ; aucun jeton dans le JavaScript public ou le dépôt.

## 6. Météo et agenda

Conserver les conditions réelles, prévisions, heure locale et coucher du soleil, avec source et date de mise à jour. Le fuseau utilisé est `America/Mexico_City`.

Prévoir le cache, un délai maximal et une indication honnête lorsque les données sont indisponibles. Vérifier les conditions d'utilisation du fournisseur pour l'exploitation commerciale et utiliser la configuration adaptée. Ne pas remplacer une panne par des valeurs fictives.

Pour l'agenda : date, lieu, source officielle, description, catégorie, statut et ajout au calendrier. Prévoir annulation, modification et archivage des événements passés.

Les événements 2027 de la maquette ont été vérifiés le 20 novembre 2026. Revérifier leurs dates et programmes avant une publication commerciale. Les festivals locaux ne sont pas présentés comme organisés par l'hôtel.

Relier chaque événement à une préparation de séjour avec dates suggérées. Respecter la convention de date de fin exclusive des événements calendaires sur plusieurs jours.

## 7. Newsletter réelle

La newsletter actuelle est uniquement une démonstration : elle ne stocke pas les adresses et n'envoie rien.

Inspecter les possibilités de connexion à o7 Pulse / Olivia One et aux services d'email déjà utilisés. Ne pas multiplier les abonnements payants.

Implémenter : enregistrement réel côté serveur, validation des entrées, protection contre les abus, consentement explicite, confirmation d'inscription, choix de langue, gestion des intérêts et désinscription.

Intérêts : lettre du chef/gastronomie, nouvelles de l'hôtel, vie de Zihua, prochains séjours et offres validées.

Ne montrer un succès que si l'opération correspondante a réellement réussi. Prévoir les erreurs de service et les adresses déjà inscrites. Décrire précisément le raccordement restant si un accès manque.

## 8. Carnet et clients habitués

Permettre de sauvegarder articles, recettes, événements et envies de séjour. L'utilisation sans compte reste possible.

Le carnet actuel est uniquement local au navigateur. Si un espace client est ajouté, permettre une synchronisation authentifiée entre appareils et une migration explicite des favoris locaux. Ne pas confondre un simple stockage local avec un compte client.

Prévoir une connexion entre les envies et une demande de séjour : dates, hébergement, goûts et moments souhaités.

Les avantages des clients habitués, annonces anticipées, disponibilités réservées ou offres privilégiées doivent être définis et validés par l'hôtel avant d'être affichés. Ne pas inventer de programme de fidélité.

## 9. Réservation

Réutiliser le moteur de réservation officiel et les interfaces réellement disponibles. Le lien actuel du moteur hôtelier est dans `dist/index.html` ; vérifier sa validité avant intégration.

Le formulaire actuel prépare un email : ce n'est pas une réservation et il n'envoie pas un message automatiquement. Si un formulaire serveur remplace le mailto, raccorder la réception au service réservations, conserver un identifiant de demande et afficher un accusé exact.

Distinguer : consultation, demande transmise, disponibilité, devis, réservation confirmée. Ne pas inventer les prix ou disponibilités. Vérifier les identifiants et liens propres aux villas au lieu de leur appliquer automatiquement ceux de l'hôtel.

## 10. Mobile, PWA et applications

Priorité à la version web responsive et à une PWA adaptée à l'hébergement.

Le manifeste et le service worker actuels sont une base, pas une stratégie hors ligne complète. Auditer notamment la suppression des caches : limiter toute suppression aux caches appartenant à El Sanctuario. Adapter la portée et les chemins si la revue est intégrée sous un sous-répertoire du site hôtelier.

Prévoir les mises à jour du cache, les contenus enregistrés hors connexion et l'indication de leur ancienneté. Ne pas présenter une météo ou une disponibilité périmée comme actuelle. Ne pas mettre en cache les réponses privées ou d'administration.

Les notifications doivent être optionnelles et liées aux préférences du lecteur, avec autorisation explicite. Ne pas présenter ce raccordement comme déjà fonctionnel.

Préparer une architecture réutilisable pour de futures applications iOS et Android. Leur développement natif et publication sur les stores restent une phase optionnelle. Ne pas les annoncer comme livrées.

## 11. Séquence de réalisation

1. Reproduire fidèlement le rendu actuel dans le dépôt cible, avec toutes les photos et interactions.
2. Structurer les articles, traductions et URLs sans dégrader le visuel.
3. Mettre en place l'administration éditoriale.
4. Raccorder la newsletter et les demandes de séjour avec les accès existants.
5. Finaliser le carnet et les fonctions mobiles/PWA selon le périmètre décidé.
6. Contrôler les parcours, sauvegarder le code et déployer une prévisualisation distincte.

Si une clé ou un service manque, terminer les parties indépendantes et documenter exactement ce qui reste à connecter. Ne pas remplacer un raccordement manquant par un faux succès.

## 12. Vérifications et livraison

Vérifier les parcours EN/ES : lecture, recherche, catégories, favoris et persistance, carnet, newsletter, dates de séjour, événements calendaires et réservation. Contrôler le mobile, les liens, les images, les erreurs réseau et les accès à l'administration.

Éviter les tests qui ne font que répéter le code. Utiliser les vérifications pertinentes pour les intégrations et la logique introduites.

Livrer le dépôt et la branche, les commandes de lancement, les variables nécessaires sans leurs valeurs secrètes, les contrôles réalisés et les éventuels blocages concrets.

Fournir dans la conversation un lien HTTPS DIRECT vers la prévisualisation, accessible sans compte ChatGPT. Utiliser l'hébergement autorisé et disponible, par exemple un projet Vercel distinct. Ne pas modifier les protections de la production existante. Ne pas ouvrir de navigateur externe à ma place.

Le rendu doit être consultable immédiatement ; conserver également le fichier HTML autonome comme référence visuelle.
