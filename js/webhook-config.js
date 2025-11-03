const WEBHOOK_CONFIG = {
    url: 'https://discord.com/api/webhooks/1431764635165655170/GDX4KlphnaOdyrjKGAz58fOFSM6M1D_jHtWBdUFl5hLqFJKwOY-nnTqA-bma9W5APJCF',
    roleId: '893498169009262593'
};
async function sendDiscordNotification(type, data) {
    let embed;
    
    if (type === 'contact') {
        embed = {
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
        };
    } else if (type === 'appointment') {
        embed = {
            title: '📅 Nouveau rendez-vous',
            color: 0xff9800,
            fields: [
                {
                    name: '👤 Client',
                    value: data.clientName || 'Non renseigné',
                    inline: true
                },
                {
                    name: '📱 Téléphone',
                    value: data.clientPhone || 'Non renseigné',
                    inline: true
                },
                {
                    name: '📅 Date',
                    value: data.date || 'Non renseigné',
                    inline: true
                },
                {
                    name: '🕐 Heure',
                    value: data.time || 'Non renseigné',
                    inline: true
                },
                {
                    name: '👨‍💼 Employé',
                    value: data.employeeName || 'Non assigné',
                    inline: true
                },
                {
                    name: '📋 Type',
                    value: data.type || 'Non spécifié',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'ORPI Immobilier - Système de notifications'
            }
        };
        
        if (data.message) {
            embed.fields.push({
                name: '💬 Message',
                value: data.message,
                inline: false
            });
        }
        
        embed.fields.push({
            name: '🔔 Action requise',
            value: '👉 **Consultez le Panel Administration** dans la section **Rendez-vous** pour gérer ce rendez-vous.',
            inline: false
        });
    } else {
        embed = {
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
    }
    try {
        let content = '';
        if (type === 'appointment') {
            if (data.employeeDiscordId) {
                content = `<@${data.employeeDiscordId}>`;
            } else if (data.employeeId) {
                content = `<@${data.employeeId}>`;
            } else {
                content = `<@&${WEBHOOK_CONFIG.roleId}>`;
            }
        } else {
            content = `<@&${WEBHOOK_CONFIG.roleId}>`;
        }
        
        const response = await fetch(WEBHOOK_CONFIG.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content,
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
