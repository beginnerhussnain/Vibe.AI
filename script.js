document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const voiceModeBtn = document.getElementById('voice-mode-btn');
    const voiceChatMode = document.getElementById('voice-chat-mode');
    const backToTextBtn = document.getElementById('back-to-text');
    const voiceControlBtn = document.getElementById('voice-orb'); // Changed ID to target the new orb
    const voiceStatus = document.getElementById('voice-status');
    const voiceResponse = document.getElementById('voice-response');
    const newChatBtn = document.getElementById('new-chat-btn');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const soundToggle = document.getElementById('sound-toggle');
    const quickReplies = document.getElementById('quick-replies');
    
    // Add to DOM Elements section
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const chatSidebar = document.getElementById('chat-sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const chatList = document.getElementById('chat-list');
    const chatSearch = document.getElementById('chat-search');
    
    // Audio elements
    const messageSentSound = document.getElementById('message-sent-sound');
    const messageReceivedSound = document.getElementById('message-received-sound');
    const voiceStartSound = document.getElementById('voice-start-sound');
    const voiceStopSound = document.getElementById('voice-stop-sound');
    
    // State
    let conversationHistory = [];
    let currentChatId = Date.now().toString();
    let chats = JSON.parse(localStorage.getItem('neon-ai-chats')) || {};
    let isListening = false;
    let isVoiceMode = false;
    let isSoundOn = true;
    let recognition;
    let synth = window.speechSynthesis;
    
    // Add these after the state variables section (~line 40)
function formatResponseText(text) {
    // Remove markdown symbols that don't render well
    text = text.replace(/\*\*/g, '')
               .replace(/\*/g, '')
               .replace(/_/g, '')
               .replace(/`/g, '')
               .replace(/#+\s*/g, '')
               .replace(/\n\s*-\s*/g, '\n• ')
               .replace(/\n\s*\*\s*/g, '\n• ')
               .replace(/\n\s*(\d+)\.\s*/g, '\n$1. ')
               .replace(/"([^"]+)"/g, '"$1"')
               .replace(/\n\n+/g, '\n\n');

    return text;
}

function cleanTextForSpeech(text) {
    text = text.replace(/\*\*/g, '')
               .replace(/\*/g, '')
               .replace(/_/g, '')
               .replace(/`/g, '')
               .replace(/#+\s*/g, '')
               .replace(/```[\s\S]*?```/g, ' code example ')
               .replace(/https?:\/\/[^\s]+/g, ' link ')
               .replace(/->/g, ' to ')
               .replace(/=>/g, ' implies ')
               .replace(/:/g, ', ')
               .replace(/\(/g, ' ')
               .replace(/\)/g, ' ')
               .replace(/\[/g, ' ')
               .replace(/\]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
    
    return text;
}

function formatCodeBlocks(content) {
    return content.replace(/```(\w*)\n([\s\S]*?)\n```/g, function(match, language, code) {
        if (language) {
            return `<pre><code class="${language}">${code.trim()}</code></pre>`;
        }
        return `<pre><code>${code.trim()}</code></pre>`;
    });
}

    // Initialize
    initChatHistory();
    renderQuickReplies(["Hello!", "What can you do?", "Tell me a joke", "Help"]);
    applyTheme();
    checkSoundPreference();
    
    // Initialize voice recognition
    initVoiceRecognition();
    
    // Add new functions
    function toggleSidebar() {
        document.body.classList.toggle('sidebar-open');
    }

    function renderChatList() {
        chatList.innerHTML = '';
        
        Object.values(chats).sort((a, b) => b.timestamp - a.timestamp).forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
            chatItem.innerHTML = `
                <div class="chat-title">${chat.title}</div>
                <div class="chat-time">${new Date(chat.timestamp).toLocaleString()}</div>
            `;
            chatItem.addEventListener('click', () => {
                loadChat(chat.id);
                toggleSidebar();
            });
            chatList.appendChild(chatItem);
        });
    }

    function filterChats() {
        const searchTerm = chatSearch.value.toLowerCase();
        const items = chatList.querySelectorAll('.chat-item');
        
        items.forEach(item => {
            const title = item.querySelector('.chat-title').textContent.toLowerCase();
            item.style.display = title.includes(searchTerm) ? 'block' : 'none';
        });
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        conversationHistory = chats[chatId].history;
        chatHistory.innerHTML = '';
        chats[chatId].messages.forEach(msg => {
            addMessage(msg.role, msg.content, false);
        });
        scrollToBottom();
    }

    // Functions
    function initChatHistory() {
        if (chats[currentChatId]) {
            conversationHistory = chats[currentChatId].history;
            chatHistory.innerHTML = '';
            chats[currentChatId].messages.forEach(msg => {
                addMessage(msg.role, msg.content, false);
            });
            scrollToBottom();
        } else {
            chats[currentChatId] = {
                id: currentChatId,
                title: 'New Chat',
                timestamp: Date.now(),
                messages: [],
                history: []
            };
            saveChats();
        }
        renderChatList(); // Add this line
    }   
    function saveChats() {
        localStorage.setItem('neon-ai-chats', JSON.stringify(chats));
    }
    
    function addMessage(role, content, saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    messageHeader.innerHTML = `
        <span class="name">${role === 'user' ? 'You' : 'Vibe.AI'}</span>
        <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (content.includes('```')) {
        messageContent.innerHTML = formatCodeBlocks(content);
    } else {
        messageContent.innerHTML = formatResponseText(content).replace(/\n/g, '<br>');
    }
    
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
    if (role === 'bot') {
        messageActions.innerHTML = `
            <button class="message-action-btn voice-message-btn" title="Read aloud">
                <i class="fas fa-volume-up"></i>
            </button>
            <button class="message-action-btn copy-message-btn" title="Copy text">
                <i class="fas fa-copy"></i>
            </button>
        `;
    }
    
    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageActions);
    
    chatHistory.appendChild(messageDiv);
    scrollToBottom();
    
    if (role === 'bot') {
        const voiceBtn = messageDiv.querySelector('.voice-message-btn');
        const copyBtn = messageDiv.querySelector('.copy-message-btn');
        
        voiceBtn.addEventListener('click', () => speakResponse(content));
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content);
            showToast('Copied to clipboard!');
        });
    }
    
    if (saveToHistory) {
        chats[currentChatId].messages.push({ role, content });
        
        if (chats[currentChatId].messages.length === 1 && role === 'user') {
            chats[currentChatId].title = content.length > 30 ? content.substring(0, 30) + '...' : content;
            saveChats();
        }
    }
    
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
    
    return messageDiv;
}
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatHistory.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }
    
    function scrollToBottom() {
        chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    function renderQuickReplies(replies) {
        quickReplies.innerHTML = '';
        replies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply';
            button.textContent = reply;
            button.addEventListener('click', () => {
                userInput.value = reply;
                userInput.focus();
            });
            quickReplies.appendChild(button);
        });
    }
    
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        userInput.value = '';
        playSound(messageSentSound);
        addMessage('user', message);
        const typingIndicator = showTypingIndicator();
        
        try {
            // Prepare the request payload
            const requestBody = {
                contents: [
                    ...conversationHistory,
                    {
                        role: "user",
                        parts: [{ text: message }]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    topP: 1,
                    topK: 32,
                    maxOutputTokens: 2048
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };
            
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            chatHistory.removeChild(typingIndicator);
            
            if (data.error) {
                addMessage('bot', `API Error: ${data.error.message}`);
                return;
            }
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const responseText = data.candidates[0].content.parts[0].text;
                playSound(messageReceivedSound);
                addMessage('bot', responseText);
                
                // Update conversation history
                conversationHistory.push(
                    {
                        role: "user",
                        parts: [{ text: message }]
                    },
                    {
                        role: "model",
                        parts: [{ text: responseText }]
                    }
                );
                
                // Save to chat history
                chats[currentChatId].history = conversationHistory;
                saveChats();
                
                // Update quick replies based on context
                updateQuickReplies(responseText);
            } else {
                addMessage('bot', "Received an unexpected response format. Check console for details.");
            }
        } catch (error) {
            console.error('Error:', error);
            chatHistory.removeChild(typingIndicator);
            addMessage('bot', `Error: ${error.message}`);
        }
    }
    
    function updateQuickReplies(response) {
        // Simple logic to generate quick replies based on response
        const replies = [];
        
        if (response.includes('?')) {
            replies.push("Yes", "No", "Maybe");
        }
        
        if (response.includes('joke')) {
            replies.push("Tell me another joke", "That's funny", "I don't get it");
        }
        
        if (response.includes('help')) {
            replies.push("How do I use this?", "What can you do?", "Show me examples");
        }
        
        if (replies.length === 0) {
            replies.push("Thanks!", "Interesting", "Tell me more", "Explain that");
        }
        
        renderQuickReplies(replies);
    }
    
    function initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = function() {
                isListening = true;
                voiceStatus.textContent = "Listening...";
                voiceControlBtn.classList.add('listening');
                playSound(voiceStartSound);
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                
                if (isVoiceMode) {
                sendVoiceMessage(transcript);
                voiceResponse.textContent = "NeonAI is thinking..."; // Update status for voice mode
                } else {
                userInput.value = transcript;
                sendMessage();
                }
                
                stopVoiceRecognition();
            };
            
            recognition.onerror = function(event) {
                console.error('Voice recognition error', event.error);
                stopVoiceRecognition();
                
                if (isVoiceMode) {
                    voiceResponse.textContent = "Sorry, I didn't catch that. Please try again.";
                }
            };
            
            recognition.onend = function() {
                stopVoiceRecognition();
            };
        } else {
            voiceInputBtn.style.display = 'none';
            voiceModeBtn.style.display = 'none';
            console.warn('Speech recognition not supported');
        }
    }
    
    function startVoiceRecognition() {
        if (!recognition) {
            alert('Speech recognition not supported in your browser');
            return;
        }
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Voice recognition error:', e);
            stopVoiceRecognition();
        }
    }
    
    function stopVoiceRecognition() {
        isListening = false;
        voiceStatus.textContent = "Tap to speak";
        voiceControlBtn.classList.remove('listening');
        playSound(voiceStopSound);
    }
    
    async function sendVoiceMessage(message) {
    // Remove voiceResponse.textContent updates that show message content
    // Keep voiceResponse for status updates if needed later, but not for full messages
    
    try {
        const requestBody = {
            contents: [
                ...conversationHistory,
                {
                    role: "user",
                    parts: [{ text: message }]
                }
            ],
            generationConfig: {
                temperature: 0.9,
                topP: 1,
                topK: 32,
                maxOutputTokens: 2048
            }
        };
        
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text;
        // Add user message to main chat history
        addMessage('user', message); // Add this line
        // Add bot response to main chat history
        addMessage('bot', responseText); // Add this line
        speakResponse(responseText);

        // Keep conversation history logic as is for API context
        conversationHistory.push(
        {
            role: "user",
            parts: [{ text: message }]
        },
        {
            role: "model",
            parts: [{ text: responseText }]
        }
        );
        } else {
        // If there's an issue, still add an error message to the main chat
        addMessage('bot', "Sorry, I couldn't process that request."); // Change this line
        }
        voiceResponse.textContent = "Tap to speak"; // Reset voice response status
    } catch (error) {
        console.error('Error:', error);
        voiceResponse.textContent = "Sorry, something went wrong. Please try again.";
    }
}
    
    function speakResponse(text) {
    if (synth && isSoundOn) {
        synth.cancel();
        const cleanText = cleanTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const voices = synth.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || voice.name.includes('English')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        synth.speak(utterance);
    }
}
    
    function stopSpeaking() {
    window.speechSynthesis.cancel();
}
    
    function toggleVoiceMode() {
    isVoiceMode = !isVoiceMode;
    
    if (isVoiceMode) {
        document.querySelector('.chat-container').style.display = 'none';
        voiceChatMode.style.display = 'flex';
        voiceResponse.textContent = "Press the microphone button to speak";
    } else {
        document.querySelector('.chat-container').style.display = 'flex';
        voiceChatMode.style.display = 'none';
        stopVoiceRecognition();
        // Stop any ongoing speech synthesis when exiting voice mode
        if (synth) {
            synth.cancel();
            console.log('Speech synthesis stopped (exiting voice mode)');
        }
    }
}
    
    function toggleDarkMode() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('neon-ai-theme', isDark ? 'light' : 'dark');
        darkModeBtn.classList.toggle('active');
    }
    
    function applyTheme() {
        const savedTheme = localStorage.getItem('neon-ai-theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            darkModeBtn.classList.add('active');
        }
    }
    
    function toggleSound() {
        isSoundOn = !isSoundOn;
        localStorage.setItem('neon-ai-sound', isSoundOn ? 'on' : 'off');
        soundToggle.innerHTML = isSoundOn ? 
            '<i class="fas fa-volume-up"></i> Sound Effects' : 
            '<i class="fas fa-volume-mute"></i> Sound Effects';
        
        showToast(`Sound effects ${isSoundOn ? 'enabled' : 'disabled'}`);
    }
    
    function checkSoundPreference() {
        const soundPref = localStorage.getItem('neon-ai-sound');
        isSoundOn = soundPref ? soundPref === 'on' : true;
        
        soundToggle.innerHTML = isSoundOn ? 
            '<i class="fas fa-volume-up"></i> Sound Effects' : 
            '<i class="fas fa-volume-mute"></i> Sound Effects';
    }
    
    function playSound(audioElement) {
        if (isSoundOn && audioElement) {
            audioElement.currentTime = 0;
            audioElement.play().catch(e => console.log('Audio play error:', e));
        }
    }
    
    function createNewChat() {
        currentChatId = Date.now().toString();
        conversationHistory = [];
        chatHistory.innerHTML = '';
        chats[currentChatId] = {
            id: currentChatId,
            title: 'New Chat',
            timestamp: Date.now(),
            messages: [],
            history: []
        };
        saveChats();
        renderQuickReplies(["Hello!", "What can you do?", "Tell me a joke"]);
        showToast('New chat created');
    }
    
    function clearAllHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            chats = {};
            currentChatId = Date.now().toString();
            conversationHistory = [];
            chatHistory.innerHTML = '';
            chats[currentChatId] = {
                id: currentChatId,
                title: 'New Chat',
                timestamp: Date.now(),
                messages: [],
                history: []
            };
            saveChats();
            renderQuickReplies(["Hello!", "What can you do?", "Tell me a joke"]);
            showToast('All history cleared');
        }
    }
    
    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    document.addEventListener('click', function() {
        menuDropdown.style.display = 'none';
    });
    
    voiceInputBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });
    
    voiceModeBtn.addEventListener('click', toggleVoiceMode);
    backToTextBtn.addEventListener('click', toggleVoiceMode);
    
    voiceControlBtn.addEventListener('click', function() {
        if (isListening) {
            stopVoiceRecognition();
        } else {
            startVoiceRecognition();
        }
    });
    
    newChatBtn.addEventListener('click', createNewChat);
    darkModeBtn.addEventListener('click', toggleDarkMode);
    clearHistoryBtn.addEventListener('click', clearAllHistory);
    soundToggle.addEventListener('click', toggleSound);
    chatSearch.addEventListener('input', filterChats);
    // Add to Event Listeners section
    sidebarToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    
    // Initialize speech synthesis voices
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = function() {
            console.log('Voices loaded');
        };
    }
});

// Orb Ripple Animation
function startOrbRipples() {
    const canvas = document.getElementById('voice-orb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let ripples = [
        {radius: 50, alpha: 0.18, speed: 0.8, offset: 0},
        {radius: 70, alpha: 0.12, speed: 1.2, offset: 1},
        {radius: 90, alpha: 0.09, speed: 1.6, offset: 2}
    ];

    let volume = 0.2; // Simulated volume, replace with real input

    function drawRipples() {
        ctx.clearRect(0, 0, width, height);
        ripples.forEach((r, i) => {
            let dynamicRadius = r.radius + Math.sin(Date.now()/600 * r.speed + r.offset) * (18 + volume * 40);
            ctx.beginPath();
            ctx.arc(width/2, height/2, dynamicRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(76,201,240,${r.alpha + volume*0.2})`;
            ctx.lineWidth = 6 - i*2;
            ctx.shadowColor = "#4cc9f0";
            ctx.shadowBlur = 12 + volume*20;
            ctx.stroke();
        });
    }

    function animate() {
        drawRipples();
        requestAnimationFrame(animate);
    }
    animate();

    // Example: Simulate volume changes (replace with real mic input)
    setInterval(() => {
        volume = 0.15 + Math.abs(Math.sin(Date.now()/900)) * 0.7;
    }, 120);
}

// Start animation when voice mode is shown
document.addEventListener('DOMContentLoaded', () => {
    startOrbRipples();
    // ...existing code...
});

// If you have real voice input, update 'volume' variable in drawRipples() accordingly.