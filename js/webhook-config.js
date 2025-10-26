const WEBHOOK_CONFIG = {
    url: 'https://discord.com/api/webhooks/1431764635165655170/GDX4KlphnaOdyrjKGAz58fOFSM6M1D_jHtWBdUFl5hLqFJKwOY-nnTqA-bma9W5APJCF',
    roleId: '893498169009262593'
};
async function sendDiscordNotification(type, data) {
    const embed = type === 'contact' ? {
        title: '📧 Nouvelle demande de contact',
        color: 0x0099ff,
        fields: [
            {
                name: '👤 ID Discord',
                value: `<@${data.discordId}>`,
                inline: true
            },
            {
                name: '📱 Téléphone',
                value: data.phone,
                inline: true
            },
            {
                name: '💬 Message',
                value: data.message || 'Aucun message'
            },
            {
                name: '🔔 Action requise',
                value: '👉 **Consultez le Panel Administration** dans la section **Conversations** pour répondre.'
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'ORPI Immobilier - Système de notifications'
        }
    } : {
        title: '🏠 Nouvelle demande d\'estimation',
        color: 0x00ff00,
        fields: [
            {
                name: '👤 ID Discord',
                value: `<@${data.discordId}>`,
                inline: true
            },
            {
                name: '📱 Téléphone',
                value: data.phone,
                inline: true
            },
            {
                name: '🏘️ Type de bien',
                value: data.propertyType,
                inline: true
            },
            {
                name: '🛏️ Nombre de pièces',
                value: data.rooms,
                inline: true
            },
            {
                name: '📐 Surface estimée',
                value: `${data.area} m²`,
                inline: true
            },
            {
                name: '💰 Prix d\'achat',
                value: `${data.purchasePrice} €`,
                inline: true
            },
            {
                name: '📍 Localisation',
                value: data.location,
                inline: true
            },
            {
                name: '📝 Informations complémentaires',
                value: data.additionalInfo || 'Aucune'
            },
            {
                name: '🔔 Action requise',
                value: '👉 **Consultez le Panel Administration** dans la section **Conversations** pour répondre.\n📸 **Les images du bien sont disponibles sur le site**'
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'ORPI Immobilier - Système de notifications'
        }
    };
    try {
        const response = await fetch(WEBHOOK_CONFIG.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `<@&${WEBHOOK_CONFIG.roleId}>`,
                embeds: [embed]
            })
        });
        if (!response.ok) {
            throw new Error('Erreur lors de l\'envoi de la notification Discord');
        }
        return true;
    } catch (error) {
        console.error('Erreur webhook Discord:', error);
        throw error;
    }
}
