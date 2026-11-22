# État fonctionnel au transfert

| Élément | Présent dans le ZIP | Étape suivante |
|---|---|---|
| Direction visuelle | Nouvelle maquette responsive | Préserver le design pendant l'intégration |
| Langues | Interface et articles EN/ES | URLs par langue, CMS et métadonnées |
| Couverture | Trois ambiances selon l'heure locale ou le choix manuel | Affiner si nécessaire |
| Articles | Sept textes de démonstration lisibles dans des dialogues | Pages partageables, validation et publication |
| Lettre du chef | Exemple éditorial et recette d'inspiration clairement signalés | Contribution et validation du chef |
| Recherche et filtres | Fonctionnels côté navigateur | Adapter au contenu administré |
| Carnet | Favoris et envies dans le stockage local | Synchronisation si espace client ajouté |
| Météo | Appel à Open-Meteo avec indication d'indisponibilité | Configuration d'exploitation et cache appropriés |
| Agenda | Deux festivals 2027, sources et export calendrier | Revalidation et administration des événements |
| Newsletter | Formulaire de démonstration, préférences locales | Enregistrement réel, confirmation et envoi |
| Séjour | Préparation d'un email et lien vers le moteur officiel | Raccordement serveur si souhaité ; disponibilités réelles |
| CMS / comptes | Absents | À développer ou raccorder |
| PWA | Manifeste, icônes et cache simple | Auditer portée, mises à jour et caches avant intégration |
| iOS / Android natifs | Absents | Option ultérieure |

Le service worker actuel supprime les caches d'autres noms sur la même origine. Ne pas le réutiliser tel quel sur une origine partagée avec le site hôtelier : limiter la suppression à son propre préfixe et définir la portée adaptée. Ce point est inclus dans les instructions de reprise.

Le logo typographique et le soleil sont des éléments de proposition. Employer les actifs de marque approuvés de l'hôtel pour la mise en production.

Les données événementielles ont été vérifiées le 20 novembre 2026. Les contenus ne constituent ni des interviews réalisées ni des déclarations attribuées au personnel de l'hôtel.

La création de cette archive n'a pas modifié le site de l'hôtel, publié un dépôt GitHub ou effectué de déploiement Vercel.
