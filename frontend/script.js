const API_BASE = window.location.origin;

// State
let selectedFile = null;
let extractedEvents = [];
let accessToken = null;

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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkAuthStatus();
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
    analyzeBtn.disabled = false;
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
        
        const response = await fetch(`${API_BASE}/analyze-calendar`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
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
        showLoading('Connecting to Google Calendar...');
        
        const response = await fetch(`${API_BASE}/auth/google`);
        const data = await response.json();
        
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get auth URL');
        }
        
        // Open popup for OAuth
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');
        
        // Listen for popup to close or message
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                // Check for auth code in URL parameters
                checkAuthStatus();
            }
        }, 1000);
        
        // Listen for messages from popup
        window.addEventListener('message', async (event) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'GOOGLE_AUTH_CODE') {
                popup.close();
                clearInterval(checkClosed);
                await exchangeCodeForTokens(event.data.code);
            }
        });
        
    } catch (error) {
        hideLoading();
        console.error('Auth error:', error);
        showMessage(`Authentication error: ${error.message}`, 'error');
    }
}

async function exchangeCodeForTokens(code) {
    try {
        showLoading('Completing authentication...');
        
        const response = await fetch(`${API_BASE}/auth/google/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
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
        const response = await fetch(`${API_BASE}/create-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                events: extractedEvents,
                accessToken
            })
        });
        
        const data = await response.json();
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
    analyzeBtn.disabled = true;
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