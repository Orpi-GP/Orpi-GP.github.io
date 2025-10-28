# 📋 Mise à jour de la Navbar - Instructions

## ✅ Ce qui a été fait :

### **1. Upload Cloudinary intégré :**
- ✅ Tous les drag & drop utilisent Cloudinary
- ✅ Suppression automatique des images Cloudinary lors de la suppression de biens/intérieurs/enchères
- ✅ Barre de progression lors de l'upload

### **2. Navbar avec menus déroulants :**
- ✅ Menu "Biens" (Nos Biens, Enchères, Intérieurs)
- ✅ Menu "Services" (Estimation, Rendez-vous, Avis, Conversations)
- ✅ Délai de 200ms avant fermeture (facile à cliquer)

---

## 📝 Pages à mettre à jour :

Il reste **ces pages à mettre à jour** avec la nouvelle navbar :

1. ✅ `index.html` - **FAIT**
2. ⚠️ `biens.html` - À faire
3. ⚠️ `contact.html` - À faire
4. ⚠️ `estimation.html` - À faire
5. ⚠️ `rendez-vous.html` - À faire
6. ⚠️ `avis.html` - À faire
7. ⚠️ `mes-conversations.html` - À faire
8. ⚠️ `interieurs.html` - À faire
9. ⚠️ `enchere.html` - À faire
10. ⚠️ `guide-prix.html` - À faire
11. ⚠️ `tableau-general.html` - À faire
12. ⚠️ `fiche-employee.html` - À faire
13. ⚠️ `contrat.html` - À faire

---

## 🔧 Instructions de mise à jour :

### **Option A : Je le fais maintenant (automatique)**
Je peux mettre à jour toutes les pages automatiquement. Dis-moi simplement "OK, mets à jour toutes les pages".

### **Option B : Tu le fais manuellement**
Si tu préfères contrôler, voici comment faire pour CHAQUE page :

1. Ouvre le fichier (ex: `biens.html`)
2. Cherche `<nav class="navbar">`
3. Remplace tout jusqu'à `</nav>` par la nouvelle navbar (voir ci-dessous)

---

## 📄 Nouvelle Navbar (à copier-coller) :

```html
<nav class="navbar">
    <div class="nav-container">
        <div class="nav-logo">
            <img src="images/logo-orpi-mandelieu.png" alt="ORPI Paris">
        </div>
        <ul class="nav-menu">
            <li class="nav-item">
                <a href="index.html" class="nav-link">Accueil</a>
            </li>
            <li class="nav-item nav-dropdown">
                <a href="#" class="nav-link">
                    Biens <i class="fas fa-chevron-down"></i>
                </a>
                <ul class="dropdown-menu">
                    <li><a href="biens.html"><i class="fas fa-home"></i> Nos Biens</a></li>
                    <li><a href="enchere.html"><i class="fas fa-gavel"></i> Enchères</a></li>
                    <li><a href="interieurs.html"><i class="fas fa-couch"></i> Intérieurs</a></li>
                </ul>
            </li>
            <li class="nav-item nav-dropdown">
                <a href="#" class="nav-link">
                    Services <i class="fas fa-chevron-down"></i>
                </a>
                <ul class="dropdown-menu">
                    <li><a href="estimation.html"><i class="fas fa-calculator"></i> Estimation</a></li>
                    <li><a href="rendez-vous.html"><i class="fas fa-calendar-alt"></i> Rendez-vous</a></li>
                    <li><a href="avis.html"><i class="fas fa-star"></i> Avis</a></li>
                    <li><a href="mes-conversations.html"><i class="fas fa-comments"></i> Conversations</a></li>
                </ul>
            </li>
            <li class="nav-item">
                <a href="contact.html" class="nav-link">Contact</a>
            </li>
            <li class="nav-item" id="guidePrixLink" style="display: none;">
                <a href="guide-prix.html" class="nav-link">Guide Prix</a>
            </li>
            <li class="nav-item" id="tableauGeneralLink" style="display: none;">
                <a href="tableau-general.html" class="nav-link">Tableau</a>
            </li>
            <li class="nav-item" id="adminPanel" style="display: none;">
                <a href="admin.html" class="nav-link admin-link">
                    <i class="fas fa-shield-alt"></i> Admin
                </a>
            </li>
        </ul>
        <span class="notifications-text" id="notificationsText" style="display: none;"></span>
        <div class="notifications-btn" id="notificationsBtn" style="display: none;" onclick="toggleNotifications()">
            <i class="fas fa-bell"></i>
            <span class="notifications-badge" id="notificationsBadge" style="display: none;">0</span>
        </div>
        <div class="user-profile" id="userProfile" style="display: none;">
            <img id="userAvatar" src="" alt="Avatar" class="user-avatar">
            <span id="userName" class="user-name"></span>
            <button onclick="logout()" class="logout-btn" title="Déconnexion">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        </div>
        <button onclick="loginWithDiscord()" class="discord-login-btn" id="discordLoginBtn">
            <i class="fab fa-discord"></i> Se connecter
        </button>
        <div class="nav-toggle" id="navToggle">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
</nav>
```

**Note :** Adapte la classe `active` sur le lien correspondant à la page.

---

Tu veux que je mette à jour toutes les pages automatiquement ? 😊

