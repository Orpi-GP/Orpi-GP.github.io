const ConversationEnhancer = {
    keywords: {
        'interieur': {
            text: 'nos intérieurs',
            url: 'interieurs.html',
            description: 'Page des intérieurs'
        },
        'interieurs': {
            text: 'nos intérieurs',
            url: 'interieurs.html',
            description: 'Page des intérieurs'
        },
        'biens': {
            text: 'nos biens',
            url: 'biens.html',
            description: 'Page des biens'
        },
        'catalogue': {
            text: 'notre catalogue',
            url: 'biens.html',
            description: 'Catalogue des biens'
        },
        'estimation': {
            text: 'notre service d\'estimation',
            url: 'estimation.html',
            description: 'Page d\'estimation'
        },
        'contact': {
            text: 'notre page de contact',
            url: 'contact.html',
            description: 'Page de contact'
        },
        'enchere': {
            text: 'nos enchères',
            url: 'enchere.html',
            description: 'Page des enchères'
        },
        'rdv': {
            text: 'prendre rendez-vous',
            url: 'rendez-vous.html',
            description: 'Page de prise de rendez-vous'
        },
        'rendezvous': {
            text: 'prendre rendez-vous',
            url: 'rendez-vous.html',
            description: 'Page de prise de rendez-vous'
        },
        'accueil': {
            text: 'notre page d\'accueil',
            url: 'index.html',
            description: 'Page d\'accueil'
        }
    },

    quickReplies: {
        'bienvenue': 'Bonjour ! Merci de nous avoir contactés. Comment puis-je vous aider aujourd\'hui ?',
        'merci': 'Je vous remercie pour votre message. Notre équipe va étudier votre demande et vous recontactera rapidement.',
        'rdv_propose': 'Je vous propose de prendre rendez-vous avec l\'un de nos conseillers. Vous pouvez consulter nos disponibilités et réserver un créneau sur [rendezvous].',
        'estimation_info': 'Pour une estimation précise de votre bien, je vous invite à remplir notre formulaire en ligne sur [estimation]. Un de nos experts vous contactera dans les plus brefs délais.',
        'biens_dispo': 'Vous pouvez découvrir tous nos biens disponibles sur [biens]. N\'hésitez pas à me dire si un bien particulier vous intéresse !',
        'interieurs_info': 'Découvrez nos magnifiques intérieurs sur [interieurs]. Nous proposons une large gamme de propriétés avec différents styles et configurations.',
        'au_revoir': 'Merci pour votre intérêt. N\'hésitez pas à nous recontacter si vous avez d\'autres questions. À bientôt !',
        'en_cours': 'Votre demande est en cours de traitement. Je reviens vers vous très prochainement avec plus d\'informations.',
        'docs_demandes': 'Pourriez-vous me transmettre les documents suivants :\n- Pièce d\'identité\n- Justificatif de domicile\n- Derniers avis d\'imposition\n\nMerci !',
        'visite_planifiee': 'Parfait ! La visite est planifiée. Je vous envoie une confirmation par email avec tous les détails.'
    },

    processKeywords(text) {
        let processedText = text;
        const baseUrl = window.location.origin;

        const bracketRegex = /\[([^\]]+)\]/g;
        processedText = processedText.replace(bracketRegex, (match, keyword) => {
            const key = keyword.toLowerCase().trim();
            if (this.keywords[key]) {
                const kw = this.keywords[key];
                return `<a href="${baseUrl}/${kw.url}" target="_blank" style="color: #E30613; font-weight: 600; text-decoration: underline;">${kw.text}</a>`;
            }
            return match;
        });

        return processedText;
    },

    getSuggestions(text, cursorPosition) {
        const beforeCursor = text.substring(0, cursorPosition);
        const match = beforeCursor.match(/\[([^\]]*)$/);
        
        if (match) {
            const partial = match[1].toLowerCase();
            return Object.keys(this.keywords)
                .filter(key => key.startsWith(partial))
                .map(key => ({
                    keyword: key,
                    ...this.keywords[key]
                }));
        }
        return [];
    },

    createPreview(text) {
        return this.processKeywords(text);
    },

    getAllKeywords() {
        return Object.entries(this.keywords).map(([key, value]) => ({
            keyword: key,
            ...value
        }));
    },

    getAllQuickReplies() {
        return Object.entries(this.quickReplies).map(([key, value]) => ({
            id: key,
            text: value
        }));
    },

    insertKeyword(textarea, keyword) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const beforeCursor = text.substring(0, start);
        const match = beforeCursor.match(/\[([^\]]*)$/);
        
        if (match) {
            const replaceStart = start - match[1].length;
            textarea.value = text.substring(0, replaceStart) + keyword + ']' + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = replaceStart + keyword.length + 1;
        } else {
            textarea.value = text.substring(0, start) + '[' + keyword + ']' + text.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + keyword.length + 2;
        }
        
        textarea.focus();
        textarea.dispatchEvent(new Event('input'));
    }
};

const ConversationUI = {
    currentConversationId: null,
    autoScrollEnabled: true,
    updateInterval: null,

    initEnhancedInterface() {
        this.addKeywordHelper();
        this.addQuickRepliesButtons();
        this.addMessagePreview();
        this.setupAutoComplete();
        this.setupRealTimeUpdates();
    },

    addKeywordHelper() {
        const replyModal = document.getElementById('replyConversationModal');
        if (!replyModal) return;

        const form = replyModal.querySelector('form');
        if (!form) return;

        if (document.getElementById('keywordHelper')) return;

        const helperDiv = document.createElement('div');
        helperDiv.id = 'keywordHelper';
        helperDiv.style.cssText = `
            background: #f3f4f6;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        `;
        
        helperDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h4 style="margin: 0; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-magic"></i> Mots-clés disponibles
                </h4>
                <button type="button" id="toggleKeywordHelper" style="background: none; border: none; cursor: pointer; color: #666;">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div id="keywordHelperContent" style="display: none;">
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 0.75rem;">
                    Utilisez <code style="background: white; padding: 0.2rem 0.4rem; border-radius: 3px;">[motclé]</code> pour insérer automatiquement un lien.
                </p>
                <div id="keywordButtons" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;"></div>
                <div style="font-size: 0.75rem; color: #888; font-style: italic;">
                    💡 Astuce : Tapez [ puis commencez à écrire pour voir les suggestions
                </div>
            </div>
        `;

        const messageGroup = form.querySelector('.form-group');
        messageGroup.parentNode.insertBefore(helperDiv, messageGroup);

        this.populateKeywordButtons();

        document.getElementById('toggleKeywordHelper').addEventListener('click', () => {
            const content = document.getElementById('keywordHelperContent');
            const icon = document.querySelector('#toggleKeywordHelper i');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.className = 'fas fa-chevron-up';
            } else {
                content.style.display = 'none';
                icon.className = 'fas fa-chevron-down';
            }
        });
    },

    populateKeywordButtons() {
        const container = document.getElementById('keywordButtons');
        if (!container) return;

        const keywords = ConversationEnhancer.getAllKeywords();
        container.innerHTML = keywords.map(kw => `
            <button type="button" class="keyword-btn" data-keyword="${kw.keyword}" 
                style="background: white; border: 2px solid #E30613; color: #E30613; padding: 0.4rem 0.8rem; 
                border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;
                display: inline-flex; align-items: center; gap: 0.3rem;"
                onmouseover="this.style.background='#E30613'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#E30613';"
                title="${kw.description}">
                <i class="fas fa-link" style="font-size: 0.7rem;"></i>
                ${kw.keyword}
            </button>
        `).join('');

        container.querySelectorAll('.keyword-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById('replyMessage');
                ConversationEnhancer.insertKeyword(textarea, btn.dataset.keyword);
                this.updatePreview();
            });
        });
    },

    addQuickRepliesButtons() {
        const replyModal = document.getElementById('replyConversationModal');
        if (!replyModal) return;

        const form = replyModal.querySelector('form');
        if (!form) return;

        if (document.getElementById('quickRepliesSection')) return;

        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.id = 'quickRepliesSection';
        quickRepliesDiv.style.cssText = `
            background: #eff6ff;
            border: 2px solid #dbeafe;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        `;

        quickRepliesDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <h4 style="margin: 0; color: #1e40af; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-bolt"></i> Réponses rapides
                </h4>
                <button type="button" id="toggleQuickReplies" style="background: none; border: none; cursor: pointer; color: #666;">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div id="quickRepliesContent" style="display: none;">
                <div id="quickReplyButtons" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.5rem;"></div>
            </div>
        `;

        const messageGroup = form.querySelector('.form-group');
        messageGroup.parentNode.insertBefore(quickRepliesDiv, messageGroup);

        this.populateQuickReplies();

        document.getElementById('toggleQuickReplies').addEventListener('click', () => {
            const content = document.getElementById('quickRepliesContent');
            const icon = document.querySelector('#toggleQuickReplies i');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.className = 'fas fa-chevron-up';
            } else {
                content.style.display = 'none';
                icon.className = 'fas fa-chevron-down';
            }
        });
    },

    populateQuickReplies() {
        const container = document.getElementById('quickReplyButtons');
        if (!container) return;

        const quickReplies = ConversationEnhancer.getAllQuickReplies();
        container.innerHTML = quickReplies.map(qr => `
            <button type="button" class="quick-reply-btn" data-reply="${qr.id}"
                style="background: white; border: 2px solid #3b82f6; color: #3b82f6; padding: 0.5rem 0.8rem;
                border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; text-align: left;"
                onmouseover="this.style.background='#3b82f6'; this.style.color='white';"
                onmouseout="this.style.background='white'; this.style.color='#3b82f6';"
                title="Cliquez pour insérer ce message">
                <i class="fas fa-comment-dots" style="font-size: 0.7rem; margin-right: 0.3rem;"></i>
                ${qr.id.replace('_', ' ')}
            </button>
        `).join('');

        container.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const textarea = document.getElementById('replyMessage');
                const replyText = ConversationEnhancer.quickReplies[btn.dataset.reply];
                
                if (textarea.value.trim() === '') {
                    textarea.value = replyText;
                } else {
                    textarea.value += '\n\n' + replyText;
                }
                
                textarea.focus();
                this.updatePreview();
            });
        });
    },

    addMessagePreview() {
        const replyModal = document.getElementById('replyConversationModal');
        if (!replyModal) return;

        const textarea = document.getElementById('replyMessage');
        if (!textarea) return;

        if (document.getElementById('messagePreview')) return;

        const previewDiv = document.createElement('div');
        previewDiv.id = 'messagePreview';
        previewDiv.style.cssText = `
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 0.75rem;
            display: none;
        `;

        previewDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i class="fas fa-eye" style="color: #6b7280;"></i>
                <strong style="color: #374151; font-size: 0.9rem;">Aperçu du message</strong>
            </div>
            <div id="messagePreviewContent" style="background: white; padding: 1rem; border-radius: 6px; border-left: 4px solid #4caf50;">
            </div>
        `;

        textarea.parentNode.appendChild(previewDiv);

        textarea.addEventListener('input', () => this.updatePreview());
    },

    updatePreview() {
        const textarea = document.getElementById('replyMessage');
        const preview = document.getElementById('messagePreview');
        const previewContent = document.getElementById('messagePreviewContent');
        
        if (!textarea || !preview || !previewContent) return;

        const text = textarea.value.trim();
        
        if (text === '') {
            preview.style.display = 'none';
            return;
        }

        const hasKeywords = /\[[^\]]+\]/.test(text);
        
        if (hasKeywords) {
            preview.style.display = 'block';
            const processedText = ConversationEnhancer.processKeywords(text);
            previewContent.innerHTML = processedText.replace(/\n/g, '<br>');
        } else {
            preview.style.display = 'none';
        }
    },

    setupAutoComplete() {
        const textarea = document.getElementById('replyMessage');
        if (!textarea) return;

        if (document.getElementById('autocompleteSuggestions')) return;

        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'autocompleteSuggestions';
        suggestionsDiv.style.cssText = `
            position: absolute;
            background: white;
            border: 2px solid #E30613;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: none;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            min-width: 200px;
        `;

        textarea.parentNode.style.position = 'relative';
        textarea.parentNode.appendChild(suggestionsDiv);

        let selectedIndex = -1;

        textarea.addEventListener('input', (e) => {
            const text = textarea.value;
            const cursorPos = textarea.selectionStart;
            const suggestions = ConversationEnhancer.getSuggestions(text, cursorPos);

            if (suggestions.length > 0) {
                this.showSuggestions(suggestions, suggestionsDiv);
                selectedIndex = -1;
            } else {
                suggestionsDiv.style.display = 'none';
            }
        });

        textarea.addEventListener('keydown', (e) => {
            const items = suggestionsDiv.querySelectorAll('.suggestion-item');
            
            if (suggestionsDiv.style.display === 'block' && items.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                    this.highlightSuggestion(items, selectedIndex);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    this.highlightSuggestion(items, selectedIndex);
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    items[selectedIndex].click();
                } else if (e.key === 'Escape') {
                    suggestionsDiv.style.display = 'none';
                    selectedIndex = -1;
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (!textarea.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    },

    showSuggestions(suggestions, container) {
        container.innerHTML = suggestions.map((sug, index) => `
            <div class="suggestion-item" data-keyword="${sug.keyword}" 
                style="padding: 0.75rem 1rem; cursor: pointer; border-bottom: 1px solid #f3f4f6; 
                transition: background 0.2s;"
                onmouseover="this.style.background='#fef2f2';"
                onmouseout="this.style.background='white';">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-link" style="color: #E30613; font-size: 0.8rem;"></i>
                    <div>
                        <div style="font-weight: 600; color: #E30613; font-size: 0.9rem;">${sug.keyword}</div>
                        <div style="font-size: 0.75rem; color: #666;">${sug.description}</div>
                    </div>
                </div>
            </div>
        `).join('');

        const rect = document.getElementById('replyMessage').getBoundingClientRect();
        container.style.top = '100%';
        container.style.left = '0';
        container.style.marginTop = '0.5rem';
        container.style.display = 'block';

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const textarea = document.getElementById('replyMessage');
                ConversationEnhancer.insertKeyword(textarea, item.dataset.keyword);
                container.style.display = 'none';
                this.updatePreview();
            });
        });
    },

    highlightSuggestion(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.style.background = '#fef2f2';
            } else {
                item.style.background = 'white';
            }
        });
    },

    setupRealTimeUpdates() {
    },

    enableAutoScroll(conversationId) {
        this.currentConversationId = conversationId;
        this.autoScrollEnabled = true;
        
        setTimeout(() => this.scrollToBottom(), 100);
    },

    scrollToBottom() {
        const messagesContainer = document.querySelector('#conversationDetailsContent [style*="max-height: 400px"]');
        if (messagesContainer && this.autoScrollEnabled) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const replyModal = document.getElementById('replyConversationModal');
        if (replyModal) {
            ConversationUI.initEnhancedInterface();
        }
    }, 500);
});

const originalShowReplyModal = window.showReplyModal;
if (originalShowReplyModal) {
    window.showReplyModal = function() {
        originalShowReplyModal();
        setTimeout(() => {
            if (!document.getElementById('keywordHelper')) {
                ConversationUI.initEnhancedInterface();
            }
            ConversationUI.updatePreview();
        }, 100);
    };
}
