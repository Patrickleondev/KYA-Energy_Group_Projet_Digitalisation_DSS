##  Aperçu Médias
Voici quelques captures d'écran du tableau de bord :

![Tableau de Bord Global](DEMO/Screenshot%202026-01-22%20165708.png)

![Détails des Graphiques](DEMO/Screenshot%202026-01-22%20165839.png)

![Gestion des Tâches](DEMO/Screenshot%202026-01-22%20170008.png)

![Historique et Archivage](DEMO/Screenshot%202026-01-22%20170153.png)

---

##  Installation et Démarrage

### Option 1 : Avec Docker (Recommandé)
Cette méthode simule un vrai serveur web et permet le partage réseau.
1.  Ouvrez un terminal dans le dossier `KYA_Dashboard`.
2.  Lancez la commande : `docker-compose up -d --build`
3.  Accédez au tableau de bord sur : `http://localhost:8081`

### Option 2 : Directe
1.  Double-cliquez sur le fichier `index.html`.
*Note : Les graphiques peuvent parfois nécessiter une connexion internet pour charger les scripts via CDN.*

---

##  Partage sur le Réseau Local
Pour que vos collègues sur le même réseau Wi-Fi/Ethernet puissent voir le dashboard :
1.  Trouvez votre **adresse IP locale** (Sur Windows : tapez `ipconfig` dans le terminal et cherchez "Adresse IPv4").
2.  Envoyez-leur le lien : `http://VOTRE_IP:8081`.
    *Exemple : `http://192.168.1.15:8081`*

---

##  Fonctionnalités Clés

1.  **Tableau de Bord :**
    - Vue d'ensemble de la progression globale.
    - Comparaison automatique avec la semaine précédente (Total et par département).
    - Graphique historique et **Tableau d'historique détaillé** avec les périodes enregistrées.
2.  **Gestion des Tâches :**
    - Ajoutez de nouvelles tâches digitalisables par département.
    - **Renommer / Supprimer :** Modifiez ou supprimez n'importe quelle tâche via les icônes Pencil et Trash.
    - Mettez à jour le pourcentage de digitalisation via les curseurs.
    - **Statuts automatiques :** 0% -> *Non débuté* (en rouge), 100% -> *Terminé* (en vert).
3.  **Archivage et Périodes :**
    - **Définition de la période :** Définissez manuellement l'intervalle de dates (Du / Au) en haut de page.
    - Bouton "**Sauvegarder Semaine**" pour clôturer la période et enregistrer les moyennes ainsi que les dates dans l'historique.

---

##  Customisation

Le projet est conçu pour être facilement modifiable dans le fichier `index.html` :

### Changer les Départements
Recherchez la variable `DEPARTMENTS` (vers la ligne 95) :
```javascript
const DEPARTMENTS = [
    { id: 'rh', name: 'Ressources Humaines', icon: 'users' },
    // Ajoutez ou modifiez ici...
];
```

### Changer les Couleurs (Charte Graphique)
Recherchez la configuration Tailwind `tailwind.config` (vers la ligne 60) pour modifier les codes hexadécimaux :
- `kya-orange`: `#F58220`
- `kya-blue`: `#0054A6`



##  Persistance des Données (Partagée)

Contrairement à une simple page web, ce tableau de bord utilise désormais une **persistance centralisée** :
- **Serveur de Données** : Les informations sont stockées dans un fichier `data.json` sur le serveur (conteneur Docker).
- **Partage Réel** : Toute modification effectuée par un utilisateur est immédiatement visible par tous les autres collègues accédant à l'IP du serveur.
- **Sécurité Docker** : Les données sont protégées par un "Volume" Docker, ce qui signifie qu'elles ne sont **pas perdues** même si vous redémarrez le serveur ou l'ordinateur.
- **Indépendance du Navigateur** : Vous pouvez vider le cache de votre navigateur sans crainte, les données du dashboard resteront intactes sur le serveur.




