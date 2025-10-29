## Modifications à apporter à index.js

Ajoute Express à ton bot Discord pour créer un endpoint API qui recevra les requêtes du frontend.

### 1. Installation d'Express
```bash
npm install express
```

### 2. Modifications dans index.js

Remplace le fichier index.js actuel par celui-ci (ou ajoute les parties Express) :

```javascript
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const config = require('./config');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ]
});

client.commands = new Collection();

const app = express();
app.use(express.json());

const APP_SECRET = process.env.APP_SECRET || config.appSecret || '';
const PORT = process.env.PORT || config.apiPort || 3000;

app.post('/send-dm', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!APP_SECRET || authHeader !== `Bearer ${APP_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { discordId, message, attachments = [] } = req.body || {};

    if (!discordId || !message) {
        return res.status(400).json({ error: 'discordId et message sont requis' });
    }

    try {
        const user = await client.users.fetch(discordId);
        
        let messageContent = message;
        if (Array.isArray(attachments) && attachments.length > 0) {
            const attachmentsText = attachments
                .map((att, index) => `${index + 1}. ${att.name || 'Fichier'}: ${att.url || ''}`)
                .join('\n');
            messageContent += `\n\n📎 **Pièces jointes:**\n${attachmentsText}`;
        }

        await user.send(messageContent);
        res.json({ success: true, message: 'MP envoyé avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du MP:', error);
        
        if (error.code === 50007) {
            return res.status(400).json({ 
                error: 'Impossible d\'envoyer un MP à cet utilisateur (MPs désactivés ou utilisateur non trouvé)',
                code: error.code 
            });
        }
        
        res.status(500).json({ 
            error: 'Erreur lors de l\'envoi du MP', 
            details: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', botReady: client.isReady() });
});

async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        delete require.cache[require.resolve(`./commands/${file}`)];
        const command = require(`./commands/${file}`);
        likelihood: {
            commands.push(command.data.toJSON());
            console.log(`   ✓ ${command.data.name}`);
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log(`\n🔄 Déploiement de ${commands.length} commande(s)...`);
        
        if (config.guildId) {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
            console.log(`✅ Commandes déployées sur le serveur ${config.guildId}!`);
            console.log(`⚡ Les commandes sont disponibles immédiatement!\n`);
        } else {
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
            console.log(`✅ Commandes déployées globalement!`);
            console.log(`⏳ Attendre jusqu'à 1 heure pour la propagation.\n`);
        }
    } catch (error) {
        console.error('❌ Erreur lors du déploiement des commandes:', error);
        console.error(error);
    }
}

(async () => {
    try {
        await deployCommands();

        console.log('🔄 Chargement des commandes...');
        await loadCommands(client);
        console.log('✅ Commandes chargées avec succès!\n');

        console.log('🔄 Chargement des événements...');
        await loadEvents(client);
        console.log('✅ Événements chargés avec succès!\n');

        console.log('🔄 Connexion au bot...');
        await client.login(config.token);
        
        console.log(`✅ Bot connecté en tant que ${client.user.tag}!\n`);
        
        app.listen(PORT, () => {
            console.log(`🌐 Serveur API démarré sur le port ${PORT}`);
            console.log(`📡 Endpoint DM: http://localhost:${PORT}/send-dm`);
            console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du bot:', error);
        process.exit(1);
    }
})();

process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée:', error);
});
```

### 3. Configuration dans config.js

Ajoute dans ton fichier `config.js` :
```'diff
module.exports = {
    token: 'TON_TOKEN_BOT',
    clientId: 'TON_CLIENT_ID',
    guildId: 'TON_GUILD_ID',
    appSecret: 'UN_SECRET_AU_HASARD_POUR_SECURISER_LAPI', 
    apiPort: 3000 
};
```

### 4. Variables d'environnement (optionnel)

Ou utilise un fichier `.env` :
```
DISCORD_BOT_TOKEN=ton_token
APP_SECRET=ton_secret
PORT=3000
```

### 5. Dans le frontend (admin.html)

Une fois le bot démarré, configure l'URL de ton endpoint :
```html
<script>
    window.DISCORD_BOT_DM_API = 'https://ton-domaine-yorkhost.com/send-dm';
    window.DISCORD_BOT_DM_TOKEN = 'UN_SECRET_AU_HASARD_POUR_SECURISER_LAPI';
</script>
```

L'endpoint sera disponible sur le port configuré (par défaut 3000). Si YorkHost utilise un port spécifique ou un domaine, ajuste l'URL dans `admin.html`.

