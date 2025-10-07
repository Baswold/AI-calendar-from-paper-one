const DEFAULT_SETTINGS = {
    apiBase: window.location.origin,
    analyzeApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
    googleApiKey: '',
    extraHeaders: {}
};

let settings = loadSettings();
let apiBase = resolveApiBase(settings.apiBase);

// State
let selectedFile = null;
let extractedEvents = [];
let accessToken = null;
let googleAuthPopup = null;
let googleAuthInterval = null;
let googleMessageListenerRegistered = false;

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const analyzeBtn = document.getElementById('analyze-btn');
const authSection = document.getElementById('auth-section');
const authBtn = document.getElementById('auth-btn');
const authStatus = document.getElementById('auth-status');
const eventsSection = document.getElementById('events-section');
const eventsContainer = document.getElementById('events-container');
const createEventsBtn = document.getElementById('create-events-btn');
const cancelBtn = document.getElementById('cancel-btn');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const startOverBtn = document.getElementById('start-over-btn');
const loading = document.getElementById('loading');
const loadingMessage = document.getElementById('loading-message');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsForm = document.getElementById('settings-form');
const settingsResetBtn = document.getElementById('settings-reset-btn');
const settingsCancelBtn = document.getElementById('settings-cancel-btn');
const apiBaseDisplay = document.getElementById('api-base-display');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuthStatus();
    applySettingsToUI();
});

function setupEventListeners() {
    // File upload
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    // Buttons
    analyzeBtn.addEventListener('click', analyzeCalendar);
    authBtn.addEventListener('click', authenticateGoogle);
    createEventsBtn.addEventListener('click', createGoogleCalendarEvents);
    cancelBtn.addEventListener('click', cancelEventCreation);
    startOverBtn.addEventListener('click', startOver);

    // Settings modal
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (settingsOverlay) settingsOverlay.addEventListener('click', closeSettings);
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettings);
    if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        closeSettings();
        populateSettingsForm();
    });
    if (settingsResetBtn) settingsResetBtn.addEventListener('click', resetSettingsToDefault);
    if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);
}

function loadSettings() {
    try {
        const stored = localStorage.getItem('calendar-photo-settings');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                extraHeaders: parsed.extraHeaders || {}
            };
        }
    } catch (error) {
        console.warn('Failed to load saved settings, using defaults.', error);
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
    try {
        localStorage.setItem('calendar-photo-settings', JSON.stringify(settings));
    } catch (error) {
        console.warn('Unable to persist settings', error);
    }
}

function resolveApiBase(value) {
    if (!value) return window.location.origin;
    try {
        const url = new URL(value, window.location.origin);
        return url.origin + url.pathname.replace(/\/$/, '');
    } catch (error) {
        console.warn('Invalid API base, falling back to current origin', error);
        return window.location.origin;
    }
}

function applySettingsToUI() {
    apiBase = resolveApiBase(settings.apiBase);
    updateApiBaseDisplay();
    populateSettingsForm();
}

function updateApiBaseDisplay() {
    if (!apiBaseDisplay) return;
    apiBaseDisplay.textContent = apiBase;
}

function populateSettingsForm() {
    if (!settingsForm) return;
    settingsForm.elements.apiBase.value = settings.apiBase || '';
    settingsForm.elements.analyzeApiKey.value = settings.analyzeApiKey || '';
    settingsForm.elements.googleClientId.value = settings.googleClientId || '';
    settingsForm.elements.googleClientSecret.value = settings.googleClientSecret || '';
    settingsForm.elements.googleApiKey.value = settings.googleApiKey || '';
    const extraHeaders = settings.extraHeaders && Object.keys(settings.extraHeaders).length
        ? JSON.stringify(settings.extraHeaders, null, 2)
        : '';
    settingsForm.elements.extraHeaders.value = extraHeaders;
}

function openSettings() {
    populateSettingsForm();
    if (settingsModal) settingsModal.classList.remove('hidden');
    if (settingsModal) settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
    if (settingsModal) settingsModal.classList.add('hidden');
    if (settingsModal) settingsModal.setAttribute('aria-hidden', 'true');
}

function resetSettingsToDefault() {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettingsToUI();
    populateSettingsForm();
    showMessage('Settings reset to defaults.', 'info');
}

function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!settingsForm) return;

    const formData = new FormData(settingsForm);
    const nextSettings = {
        apiBase: getTrimmedValue(formData, 'apiBase', DEFAULT_SETTINGS.apiBase),
        analyzeApiKey: getTrimmedValue(formData, 'analyzeApiKey'),
        googleClientId: getTrimmedValue(formData, 'googleClientId'),
        googleClientSecret: getTrimmedValue(formData, 'googleClientSecret'),
        googleApiKey: getTrimmedValue(formData, 'googleApiKey'),
        extraHeaders: {}
    };

    const extraHeadersText = getTrimmedValue(formData, 'extraHeaders');
    if (extraHeadersText) {
        try {
            const parsed = JSON.parse(extraHeadersText);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                nextSettings.extraHeaders = parsed;
            } else {
                throw new Error('Extra headers must be a JSON object.');
            }
        } catch (error) {
            showMessage(`Could not save extra headers: ${error.message}`, 'error');
            return;
        }
    }

    settings = nextSettings;
    saveSettings();
    applySettingsToUI();
    closeSettings();
    showMessage('Settings saved successfully.', 'success');
}

function buildHeaders({ includeAnalyzeKey = false, includeGoogleKey = false } = {}) {
    const headers = { ...(settings.extraHeaders || {}) };

    if (includeAnalyzeKey && settings.analyzeApiKey) {
        headers['X-Api-Key'] = settings.analyzeApiKey;
    }

    if (includeGoogleKey && settings.googleApiKey) {
        headers['X-Google-Api-Key'] = settings.googleApiKey;
    }

    return headers;
}

function getTrimmedValue(formData, key, fallback = '') {
    const value = formData.get(key);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || fallback;
    }
    return fallback;
}

function buildCalendarSettingsPayload() {
    const payload = {};
    if (settings.googleClientId) payload.clientId = settings.googleClientId;
    if (settings.googleClientSecret) payload.clientSecret = settings.googleClientSecret;
    if (settings.googleApiKey) payload.apiKey = settings.googleApiKey;
    return Object.keys(payload).length > 0 ? payload : null;
}

function ensureGoogleMessageListener() {
    if (googleMessageListenerRegistered) return;
    window.addEventListener('message', handleGoogleAuthMessage);
    googleMessageListenerRegistered = true;
}

function handleGoogleAuthMessage(event) {
    if (event.origin !== window.location.origin) return;
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'GOOGLE_AUTH_CODE' && event.data.code) {
        if (googleAuthPopup && !googleAuthPopup.closed) {
            googleAuthPopup.close();
        }
        googleAuthPopup = null;
        if (googleAuthInterval) {
            clearInterval(googleAuthInterval);
            googleAuthInterval = null;
        }
        exchangeCodeForTokens(event.data.code);
    }
}

async function extractJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Invalid JSON response: ${error.message}`);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file.', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
        showMessage('File size must be less than 10MB.', 'error');
        return;
    }

    selectedFile = file;
    displayPreview(file);
    updateAnalyzeButtonState();
}

function updateAnalyzeButtonState() {
    analyzeBtn.disabled = !selectedFile;
}

function displayPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadContent = uploadArea.querySelector('.upload-content');
        uploadContent.innerHTML = `
            <h3>Selected: ${file.name}</h3>
            <img src="${e.target.result}" class="preview-image" alt="Calendar preview">
            <p>Click to select a different image</p>
        `;
    };
    reader.readAsDataURL(file);
}

async function analyzeCalendar() {
    if (!selectedFile) {
        showMessage('Please select an image first.', 'error');
        return;
    }
    
    showLoading('Analyzing your calendar...');
    
    try {
        const formData = new FormData();
        formData.append('calendar', selectedFile);

        const response = await fetch(`${apiBase}/analyze-calendar`, {
            method: 'POST',
            headers: buildHeaders({ includeAnalyzeKey: true }),
            body: formData
        });

        const data = await extractJson(response);
        hideLoading();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze calendar');
        }
        
        extractedEvents = data.events;
        
        if (extractedEvents.length === 0) {
            showMessage('No events found in the image. Please try with a clearer calendar photo.', 'info');
            return;
        }
        
        displayEvents();
        authSection.classList.remove('hidden');
        
    } catch (error) {
        hideLoading();
        console.error('Error analyzing calendar:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

function displayEvents() {
    const table = document.createElement('table');
    table.className = 'events-table';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Description</th>
                <th>Location</th>
            </tr>
        </thead>
        <tbody>
            ${extractedEvents.map((event, index) => `
                <tr class="event-row">
                    <td><input type="text" value="${event.title || ''}" data-field="title" data-index="${index}"></td>
                    <td><input type="date" value="${event.date || ''}" data-field="date" data-index="${index}"></td>
                    <td><input type="time" value="${event.startTime || ''}" data-field="startTime" data-index="${index}"></td>
                    <td><input type="time" value="${event.endTime || ''}" data-field="endTime" data-index="${index}"></td>
                    <td><textarea data-field="description" data-index="${index}">${event.description || ''}</textarea></td>
                    <td><input type="text" value="${event.location || ''}" data-field="location" data-index="${index}"></td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    // Add event listeners for input changes
    table.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index);
        if (field && index !== undefined) {
            extractedEvents[index][field] = e.target.value;
        }
    });
    
    eventsContainer.innerHTML = '';
    eventsContainer.appendChild(table);
    eventsSection.classList.remove('hidden');
}

async function authenticateGoogle() {
    try {
        ensureGoogleMessageListener();
        showLoading('Connecting to Google Calendar...');

        const calendarSettings = buildCalendarSettingsPayload();
        const url = new URL(`${apiBase}/auth/google`);

        if (calendarSettings && calendarSettings.clientId) {
            url.searchParams.set('client_id', calendarSettings.clientId);
        }
        if (calendarSettings && calendarSettings.apiKey) {
            url.searchParams.set('api_key', calendarSettings.apiKey);
        }

        const response = await fetch(url.toString(), {
            headers: buildHeaders({ includeGoogleKey: true })
        });
        const data = await extractJson(response);

        hideLoading();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to get auth URL');
        }

        // Open popup for OAuth
        if (googleAuthPopup && !googleAuthPopup.closed) {
            googleAuthPopup.close();
        }

        googleAuthPopup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');

        if (!googleAuthPopup) {
            throw new Error('Popup blocked. Please allow popups for this site.');
        }

        if (googleAuthInterval) {
            clearInterval(googleAuthInterval);
        }

        googleAuthInterval = setInterval(() => {
            if (!googleAuthPopup || googleAuthPopup.closed) {
                if (googleAuthPopup && googleAuthPopup.closed) {
                    googleAuthPopup = null;
                }
                clearInterval(googleAuthInterval);
                googleAuthInterval = null;
                checkAuthStatus();
            }
        }, 1000);

    } catch (error) {
        hideLoading();
        if (googleAuthInterval) {
            clearInterval(googleAuthInterval);
            googleAuthInterval = null;
        }
        if (googleAuthPopup && !googleAuthPopup.closed) {
            googleAuthPopup.close();
        }
        googleAuthPopup = null;
        console.error('Auth error:', error);
        showMessage(`Authentication error: ${error.message}`, 'error');
    }
}

async function exchangeCodeForTokens(code) {
    try {
        showLoading('Completing authentication...');
        
        const calendarSettings = buildCalendarSettingsPayload();
        const headers = buildHeaders({ includeGoogleKey: true });
        headers['Content-Type'] = 'application/json';

        const payload = { code };
        if (calendarSettings) {
            payload.calendarSettings = calendarSettings;
        }

        const response = await fetch(`${apiBase}/auth/google/callback`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const data = await extractJson(response);
        hideLoading();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate');
        }
        
        accessToken = data.tokens.access_token;
        showAuthSuccess();
        
    } catch (error) {
        hideLoading();
        console.error('Token exchange error:', error);
        showMessage(`Authentication failed: ${error.message}`, 'error');
    }
}

function showAuthSuccess() {
    authStatus.innerHTML = '<div class="status-message success">✅ Connected to Google Calendar successfully!</div>';
    authBtn.textContent = 'Reconnect Google Calendar';
    createEventsBtn.disabled = false;
}

function checkAuthStatus() {
    ensureGoogleMessageListener();
    // Check URL parameters for auth code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        exchangeCodeForTokens(code);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function createGoogleCalendarEvents() {
    if (!accessToken) {
        showMessage('Please authenticate with Google Calendar first.', 'error');
        return;
    }
    
    if (extractedEvents.length === 0) {
        showMessage('No events to create.', 'error');
        return;
    }
    
    showLoading('Creating events in Google Calendar...');
    
    try {
        const headers = buildHeaders({ includeGoogleKey: true });
        headers['Content-Type'] = 'application/json';

        const payload = {
            events: extractedEvents,
            accessToken
        };

        const calendarSettings = buildCalendarSettingsPayload();
        if (calendarSettings) {
            payload.calendarSettings = calendarSettings;
        }

        const response = await fetch(`${apiBase}/create-events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const data = await extractJson(response);
        hideLoading();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create events');
        }
        
        displayResults(data.results);
        
    } catch (error) {
        hideLoading();
        console.error('Error creating events:', error);
        showMessage(`Error creating events: ${error.message}`, 'error');
    }
}

function displayResults(results) {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    let html = `
        <div class="status-message ${failureCount > 0 ? 'info' : 'success'}">
            ✅ ${successCount} events created successfully
            ${failureCount > 0 ? `<br>❌ ${failureCount} events failed` : ''}
        </div>
    `;
    
    html += results.map(result => `
        <div class="result-item ${result.success ? 'success' : 'error'}">
            <div class="result-icon">${result.success ? '✅' : '❌'}</div>
            <div class="result-details">
                <div class="result-title">${result.title}</div>
                <div class="result-meta">
                    ${result.date}
                    ${result.success ? '' : ` - Error: ${result.error}`}
                </div>
            </div>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = html;
    eventsSection.classList.add('hidden');
    authSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
}

function cancelEventCreation() {
    if (confirm('Are you sure you want to cancel? This will discard all extracted events.')) {
        startOver();
    }
}

function startOver() {
    selectedFile = null;
    extractedEvents = [];
    accessToken = null;
    
    // Reset UI
    document.getElementById('upload-section').classList.remove('hidden');
    authSection.classList.add('hidden');
    eventsSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    
    // Reset upload area
    const uploadContent = uploadArea.querySelector('.upload-content');
    uploadContent.innerHTML = `
        <div class="upload-icon">📷</div>
        <h3>Drop your calendar photo here</h3>
        <p>or click to browse</p>
    `;
    
    // Reset buttons
    updateAnalyzeButtonState();
    createEventsBtn.disabled = true;
    authStatus.innerHTML = '';
    authBtn.textContent = 'Connect Google Calendar';
    fileInput.value = '';
}

function showLoading(message) {
    loadingMessage.textContent = message;
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showMessage(message, type = 'info') {
    // Create temporary message element
    const messageEl = document.createElement('div');
    messageEl.className = `status-message ${type}`;
    messageEl.textContent = message;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.right = '20px';
    messageEl.style.zIndex = '9999';
    messageEl.style.minWidth = '300px';
    
    document.body.appendChild(messageEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
        }
    }, 5000);
}