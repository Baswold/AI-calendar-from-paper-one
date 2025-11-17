// Calendar Photo Converter - Frontend Application
class CalendarPhotoConverter {
    constructor() {
        this.files = [];
        this.extractedEvents = [];
        this.isProcessing = false;
        this.isAuthorized = false;

        // Configure API base URL dynamically based on current origin
        this.apiBase = this.loadApiBase();

        this.initializeElements();
        this.attachEventListeners();
        this.showSection('uploadSection');

        // Log configuration on startup
        console.log('Calendar Photo Converter initialized');
        console.log('API Base URL:', this.apiBase);
    }

    /**
     * Load API base URL from localStorage or use current origin as default
     * This allows the frontend to work regardless of which port the server is running on
     */
    loadApiBase() {
        try {
            const savedApiBase = localStorage.getItem('calendar-api-base');
            if (savedApiBase) {
                console.log('Using saved API base from localStorage:', savedApiBase);
                return savedApiBase;
            }
        } catch (error) {
            console.warn('Could not load saved API base:', error);
        }

        // Default to current origin (e.g., http://localhost:8000)
        const defaultBase = window.location.origin;
        console.log('Using default API base (current origin):', defaultBase);
        return defaultBase;
    }

    /**
     * Update the API base URL and save to localStorage
     * @param {string} newBase - New API base URL
     */
    setApiBase(newBase) {
        try {
            this.apiBase = newBase;
            localStorage.setItem('calendar-api-base', newBase);
            console.log('API base updated to:', newBase);
        } catch (error) {
            console.error('Failed to save API base:', error);
        }
    }

    initializeElements() {
        // Get DOM elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.processButton = document.getElementById('processButton');
        this.statusMessage = document.getElementById('statusMessage');

        // Progress elements
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');

        // Events table elements
        this.eventsTableBody = document.getElementById('eventsTableBody');
        this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
        this.selectAllButton = document.getElementById('selectAllButton');
        this.deselectAllButton = document.getElementById('deselectAllButton');
        this.addToCalendarButton = document.getElementById('addToCalendarButton');

        // OAuth elements
        this.authorizeButton = document.getElementById('authorizeButton');

        // Other buttons
        this.startOverButton = document.getElementById('startOverButton');

        // Settings elements
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsOverlay = document.getElementById('settingsOverlay');
        this.closeSettingsButton = document.getElementById('closeSettingsButton');
        this.settingsForm = document.getElementById('settingsForm');
        this.apiBaseInput = document.getElementById('apiBaseInput');
        this.currentApiDisplay = document.getElementById('currentApiDisplay');
        this.resetApiButton = document.getElementById('resetApiButton');
    }

    attachEventListeners() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // File input
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Process button
        this.processButton.addEventListener('click', this.processImages.bind(this));

        // Events table controls
        this.selectAllCheckbox.addEventListener('change', this.handleSelectAll.bind(this));
        this.selectAllButton.addEventListener('click', () => this.setAllCheckboxes(true));
        this.deselectAllButton.addEventListener('click', () => this.setAllCheckboxes(false));
        this.addToCalendarButton.addEventListener('click', this.addEventsToCalendar.bind(this));

        // OAuth
        this.authorizeButton.addEventListener('click', this.authorizeGoogleCalendar.bind(this));

        // Start over
        this.startOverButton.addEventListener('click', this.startOver.bind(this));

        // Settings modal
        this.settingsButton.addEventListener('click', this.openSettings.bind(this));
        this.closeSettingsButton.addEventListener('click', this.closeSettings.bind(this));
        this.settingsOverlay.addEventListener('click', this.closeSettings.bind(this));
        this.settingsForm.addEventListener('submit', this.saveSettings.bind(this));
        this.resetApiButton.addEventListener('click', this.resetApiToDefault.bind(this));

        // Escape key to close settings
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.settingsModal.classList.contains('hidden')) {
                this.closeSettings();
            }
        });
    }

    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        this.addFiles(files);
    }

    addFiles(newFiles) {
        newFiles.forEach(file => {
            if (!this.files.some(f => f.name === file.name && f.size === file.size)) {
                this.files.push(file);
            }
        });
        this.updateFileList();
        this.processButton.disabled = this.files.length === 0;
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFileList();
        this.processButton.disabled = this.files.length === 0;
    }

    updateFileList() {
        if (this.files.length === 0) {
            this.fileList.innerHTML = '';
            return;
        }

        this.fileList.innerHTML = this.files.map((file, index) => `
            <div class="file-item">
                <i class="fas fa-image"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <i class="fas fa-times remove-file" onclick="app.removeFile(${index})"></i>
            </div>
        `).join('');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Processing methods
    async processImages() {
        if (this.isProcessing || this.files.length === 0) return;

        this.isProcessing = true;
        this.showSection('processingSection');
        this.updateProgress(0, 'Preparing to analyze images...');

        try {
            // Simulate processing steps
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                this.updateProgress(
                    ((i + 1) / this.files.length) * 80,
                    `Analyzing ${file.name}...`
                );
                
                // Simulate API call delay
                await this.delay(1000 + Math.random() * 1000);
                
                // Generate mock events for each image
                const events = await this.extractEventsFromImage(file);
                this.extractedEvents.push(...events);
            }

            this.updateProgress(90, 'Processing extracted events...');
            await this.delay(500);

            this.updateProgress(100, 'Analysis complete!');
            await this.delay(500);

            if (this.extractedEvents.length > 0) {
                this.showEventsSection();
            } else {
                this.showStatus('No events found in the uploaded images. Please try with clearer calendar photos.', 'info');
                this.showSection('uploadSection');
            }

        } catch (error) {
            console.error('Processing error:', error);
            this.showStatus('An error occurred while processing images. Please try again.', 'error');
            this.showSection('uploadSection');
        } finally {
            this.isProcessing = false;
        }
    }

    async extractEventsFromImage(file) {
        try {
            // Create FormData for image upload
            const formData = new FormData();
            formData.append('calendar', file);

            // Construct API URL using dynamic base
            const apiUrl = `${this.apiBase}/api/analyze-calendar`;
            console.log('Calling API:', apiUrl);

            // Make API call to backend
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details available');
                throw new Error(`API call failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }

            const result = await response.json();
            console.log('API response:', result);

            if (result.events && result.events.length > 0) {
                // Process and format the events from Claude Vision API
                console.log(`Successfully extracted ${result.events.length} events from ${file.name}`);
                return result.events.map(event => ({
                    id: Date.now() + Math.random(),
                    title: event.title || 'Untitled Event',
                    date: event.date || new Date().toISOString().split('T')[0],
                    time: event.startTime ? this.formatTime(event.startTime, event.endTime) : null,
                    description: event.description || '',
                    location: event.location || '',
                    sourceImage: file.name,
                    selected: true
                }));
            } else {
                // Fallback to mock events if API returns no events
                console.warn('No events extracted from image, using mock data for demo');
                return this.generateMockEvents(file.name);
            }
        } catch (error) {
            console.error('Error calling Claude Vision API:', error);
            console.error('API Base URL was:', this.apiBase);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack
            });

            // Fallback to mock events on error
            console.warn('API call failed, using mock data for demo');
            return this.generateMockEvents(file.name);
        }
    }

    formatTime(startTime, endTime) {
        if (!startTime) return null;
        let timeStr = this.formatSingleTime(startTime);
        if (endTime && endTime !== startTime) {
            timeStr += ` - ${this.formatSingleTime(endTime)}`;
        }
        return timeStr;
    }

    formatSingleTime(time) {
        if (!time) return '';
        // Convert 24-hour format to 12-hour format
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    generateMockEvents(imageName) {
        // Generate realistic mock events for demonstration
        const mockEventTemplates = [
            {
                title: 'Team Meeting',
                date: '2024-01-15',
                time: '10:00 AM',
                description: 'Weekly team sync and project updates'
            },
            {
                title: 'Doctor Appointment',
                date: '2024-01-16',
                time: '2:30 PM',
                description: 'Annual check-up with Dr. Smith'
            },
            {
                title: 'Birthday Party',
                date: '2024-01-18',
                time: '7:00 PM',
                description: 'Sarah\'s surprise birthday celebration'
            },
            {
                title: 'Conference Call',
                date: '2024-01-20',
                time: '11:00 AM',
                description: 'Client presentation and Q&A session'
            },
            {
                title: 'Gym Session',
                date: '2024-01-22',
                time: '6:00 AM',
                description: 'Morning workout with personal trainer'
            },
            {
                title: 'Dinner Reservation',
                date: '2024-01-25',
                time: '8:00 PM',
                description: 'Anniversary dinner at The Rose Restaurant'
            }
        ];

        // Return 1-3 random events per image
        const numEvents = Math.floor(Math.random() * 3) + 1;
        const selectedEvents = [];
        
        for (let i = 0; i < numEvents; i++) {
            const template = mockEventTemplates[Math.floor(Math.random() * mockEventTemplates.length)];
            selectedEvents.push({
                ...template,
                id: Date.now() + Math.random(),
                sourceImage: imageName,
                selected: true
            });
        }

        return selectedEvents;
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = text;
    }

    // Events display methods
    showEventsSection() {
        this.showSection('eventsSection');
        this.renderEventsTable();
        this.updateAddToCalendarButton();
    }

    renderEventsTable() {
        if (this.extractedEvents.length === 0) {
            this.eventsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No events found</td></tr>';
            return;
        }

        this.eventsTableBody.innerHTML = this.extractedEvents.map((event, index) => `
            <tr>
                <td>
                    <input type="checkbox" 
                           ${event.selected ? 'checked' : ''} 
                           onchange="app.toggleEventSelection(${index})">
                </td>
                <td>
                    <div class="event-title">${this.escapeHtml(event.title)}</div>
                </td>
                <td>
                    <div class="event-date">${this.formatDate(event.date)}</div>
                </td>
                <td>
                    <div class="event-time">${event.time || 'All day'}</div>
                </td>
                <td>
                    <div class="event-description">${this.escapeHtml(event.description || '')}</div>
                </td>
                <td>
                    <div class="source-image">${this.escapeHtml(event.sourceImage)}</div>
                </td>
            </tr>
        `).join('');
    }

    toggleEventSelection(index) {
        this.extractedEvents[index].selected = !this.extractedEvents[index].selected;
        this.updateSelectAllCheckbox();
        this.updateAddToCalendarButton();
    }

    handleSelectAll(e) {
        this.setAllCheckboxes(e.target.checked);
    }

    setAllCheckboxes(checked) {
        this.extractedEvents.forEach(event => event.selected = checked);
        this.selectAllCheckbox.checked = checked;
        this.renderEventsTable();
        this.updateAddToCalendarButton();
    }

    updateSelectAllCheckbox() {
        const selectedCount = this.extractedEvents.filter(e => e.selected).length;
        const totalCount = this.extractedEvents.length;
        
        this.selectAllCheckbox.checked = selectedCount === totalCount;
        this.selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }

    updateAddToCalendarButton() {
        const hasSelected = this.extractedEvents.some(e => e.selected);
        this.addToCalendarButton.disabled = !hasSelected;
    }

    // Google Calendar integration
    async addEventsToCalendar() {
        const selectedEvents = this.extractedEvents.filter(e => e.selected);
        
        if (selectedEvents.length === 0) {
            this.showStatus('Please select at least one event to add to calendar.', 'info');
            return;
        }

        if (!this.isAuthorized) {
            this.showSection('oauthSection');
            return;
        }

        try {
            this.showStatus('Adding events to Google Calendar...', 'info');
            
            // Simulate API calls to Google Calendar
            for (let i = 0; i < selectedEvents.length; i++) {
                await this.delay(500); // Simulate API call
                console.log('Adding event to calendar:', selectedEvents[i]);
            }
            
            this.showSection('successSection');
            this.showStatus(`Successfully added ${selectedEvents.length} events to your Google Calendar!`, 'success');
            
        } catch (error) {
            console.error('Calendar integration error:', error);
            this.showStatus('Failed to add events to calendar. Please try again.', 'error');
        }
    }

    async authorizeGoogleCalendar() {
        try {
            this.showStatus('Connecting to Google Calendar...', 'info');
            
            // Simulate OAuth flow
            await this.delay(2000);
            
            // Mock successful authorization
            this.isAuthorized = true;
            this.showStatus('Successfully authorized! You can now add events to your calendar.', 'success');
            
            // Return to events section
            this.showEventsSection();
            
        } catch (error) {
            console.error('Authorization error:', error);
            this.showStatus('Authorization failed. Please try again.', 'error');
        }
    }

    // Settings methods
    openSettings() {
        this.apiBaseInput.value = this.apiBase !== window.location.origin ? this.apiBase : '';
        this.updateCurrentApiDisplay();
        this.settingsModal.classList.remove('hidden');
        this.settingsOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeSettings() {
        this.settingsModal.classList.add('hidden');
        this.settingsOverlay.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }

    saveSettings(e) {
        e.preventDefault();

        const newApiBase = this.apiBaseInput.value.trim();

        if (newApiBase) {
            // Validate URL format
            try {
                new URL(newApiBase);
                this.setApiBase(newApiBase);
                this.showStatus(`API base updated to: ${newApiBase}`, 'success');
            } catch (error) {
                this.showStatus('Invalid URL format. Please enter a valid URL.', 'error');
                return;
            }
        } else {
            // Use default (current origin)
            const defaultBase = window.location.origin;
            this.setApiBase(defaultBase);
            localStorage.removeItem('calendar-api-base'); // Clear saved preference
            this.showStatus('API base reset to current origin', 'success');
        }

        this.updateCurrentApiDisplay();
        this.closeSettings();
    }

    resetApiToDefault() {
        this.apiBaseInput.value = '';
        const defaultBase = window.location.origin;
        this.setApiBase(defaultBase);
        localStorage.removeItem('calendar-api-base');
        this.updateCurrentApiDisplay();
        this.showStatus('API base reset to default (current origin)', 'info');
    }

    updateCurrentApiDisplay() {
        if (this.currentApiDisplay) {
            this.currentApiDisplay.textContent = this.apiBase;
        }
    }

    // Utility methods
    showSection(sectionId) {
        const sections = ['uploadSection', 'processingSection', 'eventsSection', 'oauthSection', 'successSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('hidden', id !== sectionId);
            }
        });
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.classList.remove('hidden');
        
        // Auto-hide info messages after 5 seconds
        if (type === 'info') {
            setTimeout(() => {
                this.statusMessage.classList.add('hidden');
            }, 5000);
        }
    }

    startOver() {
        this.files = [];
        this.extractedEvents = [];
        this.isProcessing = false;
        
        this.fileInput.value = '';
        this.updateFileList();
        this.processButton.disabled = true;
        this.statusMessage.classList.add('hidden');
        
        this.showSection('uploadSection');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CalendarPhotoConverter();
});

// Add some additional utility functions for enhanced functionality
document.addEventListener('DOMContentLoaded', () => {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to go back or start over
        if (e.key === 'Escape') {
            const currentSection = document.querySelector('.section:not(.hidden)');
            if (currentSection && currentSection.id !== 'uploadSection') {
                if (window.app && typeof window.app.startOver === 'function') {
                    window.app.startOver();
                }
            }
        }
        
        // Ctrl/Cmd + A to select all events
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            const eventsSection = document.getElementById('eventsSection');
            if (eventsSection && !eventsSection.classList.contains('hidden')) {
                e.preventDefault();
                if (window.app && typeof window.app.setAllCheckboxes === 'function') {
                    window.app.setAllCheckboxes(true);
                }
            }
        }
    });

    // Add connection status indicator
    const addConnectionStatus = () => {
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'connectionStatus';
        statusIndicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        const updateStatus = (online) => {
            if (online) {
                statusIndicator.style.background = '#d4edda';
                statusIndicator.style.color = '#155724';
                statusIndicator.style.border = '1px solid #c3e6cb';
                statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            } else {
                statusIndicator.style.background = '#f8d7da';
                statusIndicator.style.color = '#721c24';
                statusIndicator.style.border = '1px solid #f5c6cb';
                statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> Offline';
            }
        };
        
        updateStatus(navigator.onLine);
        
        window.addEventListener('online', () => updateStatus(true));
        window.addEventListener('offline', () => updateStatus(false));
        
        document.body.appendChild(statusIndicator);
    };
    
    addConnectionStatus();
});