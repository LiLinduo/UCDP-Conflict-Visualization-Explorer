/* ========================================
   UCDP Conflict Visualization - Main Controller
   Global State & View Coordination
   ======================================== */

// === Global State ===
const globalState = {
    // Filters
    time_range: {
        start: new Date('1989-01-01'),
        end: new Date('2024-12-31')
    },
    
    spatial_extent: {
        min_lat: -90,
        max_lat: 90,
        min_lon: -180,
        max_lon: 180
    },
    
    violence_types: [1, 2, 3], // All active by default
    
    // Selections
    selected_conflict: null,
    selected_event: null,
    
    // Hover state
    hovered: {
        type: null,  // 'conflict', 'event', null
        id: null,
        source: null
    }
};

// === Data Storage ===
const appData = {
    events: [],
    conflicts: [],
    daily_deaths: [],
    monthly_deaths: [],
    yearly_deaths: [],
    country_centroids: {}
};

// === Color Schemes ===
const colorSchemes = {
    // Violence types (used in map, timeline, uncertainty)
    violence_type: {
        1: '#5dade2', // State-based: Bright Blue
        2: '#f39c12', // Non-state: Bright Orange
        3: '#af7ac5'  // One-sided: Bright Purple
    },
    
    // Civilian vs Combatant (used in civilian impact chart)
    civilian_combatant: {
        civilian: '#f39c12',   // Bright Orange
        combatant: '#7f8c8d',  // Medium gray
        unknown: '#95a5a6'     // Light gray
    }
};

// === View Controllers ===
let mapView = null;
let timelineView = null;
let civilianView = null;
let uncertaintyView = null;

// === Initialize Dashboard ===
async function initializeDashboard() {
    console.log('Initializing UCDP Conflict Dashboard...');
    
    try {
        // Load data
        await loadData();
        
        // Initialize views
        initializeViews();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initial render
        updateAllViews();
        
        // Hide loading overlay
        hideLoading();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading data. Please refresh the page.');
    }
}

// === Data Loading ===
async function loadData() {
    console.log('Loading data...');
    
    try {
        // Load preprocessed JSON files
        const [conflicts, events, monthly] = await Promise.all([
            fetch('data/conflicts_summary.json').then(r => r.json()),
            fetch('data/events_sample.json').then(r => r.json()),
            fetch('data/monthly_deaths_by_type.json').then(r => r.json())
        ]);
        
        // Parse dates in events
        events.forEach(e => e.date = new Date(e.date));
        
        // Store in global data object
        appData.conflicts = conflicts;
        appData.events = events;
        appData.monthly_deaths = monthly;
        
        console.log(`Loaded ${conflicts.length} conflicts`);
        console.log(`Loaded ${events.length} events`);
    } catch (error) {
        console.error('Error loading data files:', error);
        console.log('Falling back to sample data...');
        
        // Fallback to sample data if files not found
        appData.conflicts = generateSampleConflicts();
        appData.events = generateSampleEvents();
        appData.monthly_deaths = generateSampleMonthlyDeaths();
        
        console.log(`Loaded ${appData.conflicts.length} conflicts (sample)`);
        console.log(`Loaded ${appData.events.length} events (sample)`);
    }
}

// === Initialize Views ===
function initializeViews() {
    // Initialize map
    if (typeof initializeMap === 'function') {
        mapView = initializeMap();
    }
    
    // Initialize timeline
    if (typeof initializeTimeline === 'function') {
        timelineView = initializeTimeline();
    }
    
    // Initialize civilian impact chart
    if (typeof initializeCivilianChart === 'function') {
        civilianView = initializeCivilianChart();
    }
    
    // Initialize uncertainty chart
    if (typeof initializeUncertaintyChart === 'function') {
        uncertaintyView = initializeUncertaintyChart();
    }
}

// === Event Listeners ===
function setupEventListeners() {
    // Time slider
    const timeSliderStart = document.getElementById('time-slider-start');
    const timeSliderEnd = document.getElementById('time-slider-end');
    
    if (timeSliderStart && timeSliderEnd) {
        timeSliderStart.addEventListener('input', handleTimeSliderChange);
        timeSliderEnd.addEventListener('input', handleTimeSliderChange);
    }
    
    // Legend toggles
    const legendItems = document.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
        item.addEventListener('click', handleLegendToggle);
    });
    
    // Reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetAllFilters);
    }
    
    // Detail panel close
    const closeDetailBtn = document.getElementById('close-detail');
    if (closeDetailBtn) {
        closeDetailBtn.addEventListener('click', closeDetailPanel);
    }
}

// === Event Handlers ===
function handleTimeSliderChange(event) {
    let startYear = parseInt(document.getElementById('time-slider-start').value);
    let endYear = parseInt(document.getElementById('time-slider-end').value);
    
    // Ensure start <= end by adjusting the value that is being moved
    if (startYear > endYear) {
        if (event.target.id === 'time-slider-start') {
            // User is moving start slider, cap it at end
            startYear = endYear;
            document.getElementById('time-slider-start').value = endYear;
        } else {
            // User is moving end slider, cap it at start
            endYear = startYear;
            document.getElementById('time-slider-end').value = startYear;
        }
    }
    
    // Update display
    document.getElementById('time-start-label').textContent = startYear;
    document.getElementById('time-end-label').textContent = endYear;
    
    // Update global state
    globalState.time_range.start = new Date(`${startYear}-01-01`);
    globalState.time_range.end = new Date(`${endYear}-12-31`);
    
    // Update all views
    updateAllViews();
}

function handleLegendToggle(event) {
    const legendItem = event.currentTarget;
    const type = parseInt(legendItem.dataset.type);
    
    // Toggle type in global state
    const index = globalState.violence_types.indexOf(type);
    if (index > -1) {
        globalState.violence_types.splice(index, 1);
        legendItem.classList.add('inactive');
    } else {
        globalState.violence_types.push(type);
        legendItem.classList.remove('inactive');
    }
    
    // Update all views
    updateAllViews();
}

function resetAllFilters() {
    // Reset global state
    globalState.time_range.start = new Date('1989-01-01');
    globalState.time_range.end = new Date('2024-12-31');
    globalState.spatial_extent = {
        min_lat: -90,
        max_lat: 90,
        min_lon: -180,
        max_lon: 180
    };
    globalState.violence_types = [1, 2, 3];
    globalState.selected_conflict = null;
    globalState.selected_event = null;
    globalState.hovered = { type: null, id: null, source: null };
    
    // Reset UI
    document.getElementById('time-slider-start').value = 1989;
    document.getElementById('time-slider-end').value = 2024;
    document.getElementById('time-start-label').textContent = '1989';
    document.getElementById('time-end-label').textContent = '2024';
    
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('inactive');
    });
    
    // Update all views
    updateAllViews();
}

// === Update All Views ===
function updateAllViews() {
    // Filter data based on current state
    const filteredData = filterData();
    
    // Update each view
    if (mapView && typeof mapView.update === 'function') {
        mapView.update(filteredData);
    }
    
    if (timelineView && typeof timelineView.update === 'function') {
        timelineView.update(filteredData);
    }
    
    if (civilianView && typeof civilianView.update === 'function') {
        civilianView.update(filteredData);
    }
    
    if (uncertaintyView && typeof uncertaintyView.update === 'function') {
        uncertaintyView.update(filteredData);
    }
    
    // Update filter summary
    updateFilterSummary(filteredData);
}

// === Data Filtering ===
function filterData() {
    const filtered = {
        events: [],
        conflicts: [],
        monthly_deaths: []
    };
    
    // Filter events
    filtered.events = appData.events.filter(event => {
        return event.date >= globalState.time_range.start &&
               event.date <= globalState.time_range.end &&
               event.latitude >= globalState.spatial_extent.min_lat &&
               event.latitude <= globalState.spatial_extent.max_lat &&
               event.longitude >= globalState.spatial_extent.min_lon &&
               event.longitude <= globalState.spatial_extent.max_lon &&
               globalState.violence_types.includes(event.type_of_violence);
    });
    
    // Filter conflicts
    filtered.conflicts = appData.conflicts.filter(conflict => {
        return globalState.violence_types.includes(conflict.violence_type);
    });
    
    // Filter monthly deaths
    filtered.monthly_deaths = appData.monthly_deaths.filter(d => {
        const date = new Date(d.year, d.month - 1, 1);
        return date >= globalState.time_range.start &&
               date <= globalState.time_range.end &&
               globalState.violence_types.includes(d.type);
    });
    
    return filtered;
}

// === Coordinated Highlighting ===
function highlightConflict(conflictId, source) {
    globalState.hovered = {
        type: 'conflict',
        id: conflictId,
        source: source
    };
    
    // Update highlights in all views
    if (mapView && typeof mapView.highlightConflict === 'function') {
        mapView.highlightConflict(conflictId);
    }
    
    if (timelineView && typeof timelineView.highlightConflict === 'function') {
        timelineView.highlightConflict(conflictId);
    }
    
    if (civilianView && typeof civilianView.highlightConflict === 'function') {
        civilianView.highlightConflict(conflictId);
    }
    
    if (uncertaintyView && typeof uncertaintyView.highlightConflict === 'function') {
        uncertaintyView.highlightConflict(conflictId);
    }
}

function clearHighlights() {
    globalState.hovered = { type: null, id: null, source: null };
    
    if (mapView && typeof mapView.clearHighlights === 'function') {
        mapView.clearHighlights();
    }
    
    if (timelineView && typeof timelineView.clearHighlights === 'function') {
        timelineView.clearHighlights();
    }
    
    if (civilianView && typeof civilianView.clearHighlights === 'function') {
        civilianView.clearHighlights();
    }
    
    if (uncertaintyView && typeof uncertaintyView.clearHighlights === 'function') {
        uncertaintyView.clearHighlights();
    }
}

// === Selection ===
function selectConflict(conflictId) {
    globalState.selected_conflict = conflictId;
    globalState.selected_event = null;
    
    // Update all views
    updateAllViews();
    
    // Show detail panel
    if (conflictId) {
        showConflictDetailPanel(conflictId);
    }
}

function selectEvent(eventId) {
    const event = appData.events.find(e => e.id === eventId);
    if (!event) return;
    
    globalState.selected_event = eventId;
    globalState.selected_conflict = null;
    
    // Show detail panel
    showEventDetailPanel(event);
}


// === Detail Panel ===
function showConflictDetailPanel(conflictId) {
    const conflict = appData.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;
    
    const panel = document.getElementById('detail-panel');
    const title = document.getElementById('detail-title');
    const content = document.getElementById('detail-content');
    
    title.textContent = conflict.name;
    
    content.innerHTML = `
        <div class="detail-section">
            <h4>Violence Type</h4>
            <p>${getViolenceTypeLabel(conflict.violence_type)}</p>
        </div>
        <div class="detail-section">
            <h4>Estimated Deaths</h4>
            <p>${conflict.best.toLocaleString()} (range: ${conflict.low.toLocaleString()} - ${conflict.high.toLocaleString()})</p>
        </div>
        <div class="detail-section">
            <h4>Civilian Deaths</h4>
            <p>${conflict.civilian_deaths.toLocaleString()} (${Math.round(conflict.civilian_ratio * 100)}% of total)</p>
        </div>
        <div class="detail-section">
            <h4>Combatant Deaths</h4>
            <p>${conflict.combatant_deaths.toLocaleString()}</p>
        </div>
        <div class="detail-section">
            <h4>Duration</h4>
            <p>${conflict.start_year} - ${conflict.end_year}</p>
        </div>
        <div class="detail-section">
            <h4>Number of Events</h4>
            <p>${conflict.event_count.toLocaleString()}</p>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

function showEventDetailPanel(event) {
    const conflict = appData.conflicts.find(c => c.id === event.conflict_id);
    
    const panel = document.getElementById('detail-panel');
    const title = document.getElementById('detail-title');
    const content = document.getElementById('detail-content');
    
    title.textContent = 'Event Details';
    
    const conflictName = conflict ? conflict.name : 'Unknown conflict';
    const dateStr = event.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    content.innerHTML = `
        <div class="detail-section event-specific">
            <h4>Date</h4>
            <p>${dateStr}</p>
        </div>
        <div class="detail-section event-specific">
            <h4>Location</h4>
            <p>${event.country}${event.region ? ', ' + event.region : ''}</p>
            <p style="font-size: 0.85rem; color: #909090;">
                ${event.latitude.toFixed(4)}°, ${event.longitude.toFixed(4)}°
            </p>
        </div>
        <div class="detail-section event-specific">
            <h4>Deaths (This Event)</h4>
            <p>${event.best.toLocaleString()}</p>
        </div>
        <div class="detail-section event-specific">
            <h4>Civilian Deaths</h4>
            <p>${event.civilian_deaths.toLocaleString()}</p>
        </div>
        <div class="detail-section event-specific">
            <h4>Combatant Deaths</h4>
            <p>${event.combatant_deaths.toLocaleString()}</p>
        </div>
        <div class="detail-section event-specific">
            <h4>Violence Type</h4>
            <p>${getViolenceTypeLabel(event.type_of_violence)}</p>
        </div>
        <div class="detail-divider"></div>
        <div class="detail-section conflict-context">
            <h4>Part of Conflict</h4>
            <p><strong>${conflictName}</strong></p>
            ${conflict ? `
                <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #b0b0b0;">
                    Total Deaths: ${conflict.best.toLocaleString()}<br>
                    Events: ${conflict.event_count.toLocaleString()}<br>
                    Duration: ${conflict.start_year} - ${conflict.end_year}
                </p>
                <button onclick="selectConflict(${conflict.id})" class="btn-view-conflict">
                    View Full Conflict →
                </button>
            ` : ''}
        </div>
    `;
    
    panel.classList.remove('hidden');
}

function closeDetailPanel() {
    document.getElementById('detail-panel').classList.add('hidden');
    globalState.selected_conflict = null;
    updateAllViews();
}

// === UI Updates ===
function updateFilterSummary(filteredData) {
    const summary = document.getElementById('filter-text');
    const eventCount = filteredData.events.length;
    
    const startYear = globalState.time_range.start.getFullYear();
    const endYear = globalState.time_range.end.getFullYear();
    
    let text = `Showing ${eventCount.toLocaleString()} events`;
    
    if (startYear !== 1989 || endYear !== 2024) {
        text += ` (${startYear}-${endYear})`;
    }
    
    if (globalState.violence_types.length < 3) {
        const types = globalState.violence_types.map(t => getViolenceTypeLabel(t));
        text += ` - ${types.join(', ')}`;
    }
    
    summary.textContent = text;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// === Utilities ===
function getViolenceTypeLabel(type) {
    const labels = {
        1: 'State-based',
        2: 'Non-state',
        3: 'One-sided'
    };
    return labels[type] || 'Unknown';
}

function getViolenceTypeClass(type) {
    const classes = {
        1: 'state-based',
        2: 'non-state',
        3: 'one-sided'
    };
    return classes[type] || '';
}

// === Sample Data Generation ===
function generateSampleConflicts() {
    const conflicts = [];
    const names = [
        'Syria: Government - IS',
        'Iraq: Government - IS',
        'Afghanistan: Government - Taliban',
        'Yemen: Government - Houthis',
        'Somalia: Government - Al-Shabaab',
        'Nigeria: Government - Boko Haram',
        'DR Congo: Various conflicts',
        'South Sudan: Government - SPLA-IO',
        'Myanmar: Government - Arakan Army',
        'Ukraine: Government - Separatists',
        'Colombia: Government - FARC',
        'Libya: Government - Haftar forces',
        'Mali: Government - JNIM',
        'Mozambique: Government - ISIS',
        'Cameroon: Government - Ambazonia',
        'Ethiopia: Government - TPLF',
        'Sudan: Government - RSF',
        'India: Government - Naxalites',
        'Philippines: Government - Abu Sayyaf',
        'Rwanda: Genocide'
    ];
    
    for (let i = 0; i < 20; i++) {
        const totalDeaths = Math.floor(Math.random() * 80000) + 5000;
        const civilianRatio = 0.3 + Math.random() * 0.6; // 30-90% civilian
        const civilianDeaths = Math.floor(totalDeaths * civilianRatio);
        const combatantDeaths = totalDeaths - civilianDeaths;
        
        const fullName = names[i];
        const shortName = fullName.replace("Government of ", "").replace("Government", "Gov");
        
        conflicts.push({
            id: i + 1,
            name: fullName,
            short_name: shortName.length > 40 ? shortName.substring(0, 37) + "..." : shortName,
            violence_type: Math.floor(Math.random() * 3) + 1,
            best: totalDeaths,
            low: Math.floor(totalDeaths * 0.7),
            high: Math.floor(totalDeaths * 1.3),
            civilian_deaths: civilianDeaths,
            combatant_deaths: combatantDeaths,
            civilian_ratio: civilianRatio,
            start_year: 2000 + Math.floor(Math.random() * 15),
            end_year: 2015 + Math.floor(Math.random() * 10),
            event_count: Math.floor(Math.random() * 5000) + 100
        });
    }
    
    return conflicts.sort((a, b) => b.civilian_deaths - a.civilian_deaths);
}

function generateSampleEvents() {
    const events = [];
    const regions = [
        { lat: 33.5, lon: 36.3, name: 'Syria' },
        { lat: 33.3, lon: 44.4, name: 'Iraq' },
        { lat: 34.5, lon: 69.2, name: 'Afghanistan' },
        { lat: 15.5, lon: 48.5, name: 'Yemen' },
        { lat: 2.0, lon: 45.3, name: 'Somalia' },
        { lat: 9.0, lon: 8.7, name: 'Nigeria' },
        { lat: -4.0, lon: 21.8, name: 'DR Congo' }
    ];
    
    for (let i = 0; i < 1000; i++) {
        const region = regions[Math.floor(Math.random() * regions.length)];
        const year = 1989 + Math.floor(Math.random() * 36);
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;
        
        events.push({
            id: i + 1,
            latitude: region.lat + (Math.random() - 0.5) * 2,
            longitude: region.lon + (Math.random() - 0.5) * 2,
            date: new Date(year, month, day),
            type_of_violence: Math.floor(Math.random() * 3) + 1,
            best: Math.floor(Math.random() * 100) + 5,
            conflict_id: Math.floor(Math.random() * 20) + 1,
            country: region.name
        });
    }
    
    return events;
}

function generateSampleMonthlyDeaths() {
    const data = [];
    
    for (let year = 1989; year <= 2024; year++) {
        for (let month = 1; month <= 12; month++) {
            for (let type = 1; type <= 3; type++) {
                data.push({
                    year: year,
                    month: month,
                    type: type,
                    deaths: Math.floor(Math.random() * 5000) + 100
                });
            }
        }
    }
    
    return data;
}