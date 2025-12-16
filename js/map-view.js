/* ========================================
   UCDP Conflict Visualization - Map View
   Interactive Spatiotemporal Map
   ======================================== */

function initializeMap() {
    const mapContainer = document.getElementById('map');
    
    // Initialize Leaflet map
    const map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true
    });
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Marker cluster group
    const markers = L.markerClusterGroup({
        maxClusterRadius: (zoom) => {
            return Math.max(40, 80 - (zoom * 5));
        },
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });
    
    map.addLayer(markers);
    
    // Current data
    let currentData = [];
    
    // Track highlighting state
    let currentlyHighlighted = null;
    let highlightTimeout = null;
    let currentHoveredElement = null;
    
    // Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('display', 'none');
    
    // === Update Function ===
    function update(filteredData) {
        currentData = filteredData.events;
        
        // Clear existing markers
        markers.clearLayers();
        currentlyHighlighted = null;
        currentHoveredElement = null;
        
        // Add markers for each event
        filteredData.events.forEach(event => {
            const markerSize = Math.sqrt(event.best) * 2;
            const violenceClass = getViolenceTypeClass(event.type_of_violence);
            
            const marker = L.circleMarker([event.latitude, event.longitude], {
                radius: Math.min(Math.max(markerSize, 3), 15),
                className: `conflict-marker ${violenceClass}`,
                fillOpacity: 0.6,
                weight: 2,
                color: 'white'
            });
            
            // Store conflict ID for reference
            marker.conflictId = event.conflict_id;
            
            // Click handler
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                selectEvent(event.id);
            });
            
            // Hover handlers with instant local feedback + delayed cross-view highlighting
            marker.on('mouseenter', (e) => {
                const element = marker.getElement();
                
                // INSTANT LOCAL FEEDBACK - no delay
                if (element) {
                    element.classList.add('hover-local');
                    element.style.cursor = 'pointer';
                    currentHoveredElement = element;
                }
                
                // Show tooltip immediately
                showTooltip(event, e);
                
                // DELAYED CROSS-VIEW HIGHLIGHTING - prevent flashing
                if (highlightTimeout) {
                    clearTimeout(highlightTimeout);
                }
                
                highlightTimeout = setTimeout(() => {
                    if (event.conflict_id && currentlyHighlighted !== event.conflict_id) {
                        currentlyHighlighted = event.conflict_id;
                        highlightConflict(event.conflict_id, 'map');
                    }
                }, 100);
            });
            
            marker.on('mouseleave', () => {
                // Clear pending timeout
                if (highlightTimeout) {
                    clearTimeout(highlightTimeout);
                    highlightTimeout = null;
                }
                
                // Remove instant local feedback
                if (currentHoveredElement) {
                    currentHoveredElement.classList.remove('hover-local');
                    currentHoveredElement = null;
                }
                
                // Hide tooltip
                hideTooltip();
                
                // Clear cross-view highlights with small delay
                setTimeout(() => {
                    if (!currentHoveredElement) {
                        currentlyHighlighted = null;
                        clearHighlights();
                    }
                }, 50);
            });
            
            markers.addLayer(marker);
        });
    }
    
    // === Highlight Function (Cross-View) ===
    function highlightConflict(conflictId) {
        markers.eachLayer(layer => {
            const element = layer.getElement();
            if (!element) return;
            
            // Don't override hover-local state
            if (element.classList.contains('hover-local')) return;
            
            if (layer.conflictId === conflictId) {
                element.classList.add('highlighted');
                element.classList.remove('dimmed');
            } else {
                element.classList.add('dimmed');
                element.classList.remove('highlighted');
            }
        });
    }
    
    // === Clear Highlights ===
    function clearHighlights() {
        markers.eachLayer(layer => {
            const element = layer.getElement();
            if (element && !element.classList.contains('hover-local')) {
                element.classList.remove('highlighted', 'dimmed');
            }
        });
    }
    
    // === Tooltip Functions ===
    function showTooltip(event, leafletEvent) {
        const conflict = appData.conflicts.find(c => c.id === event.conflict_id);
        const conflictName = conflict ? conflict.name : 'Unknown conflict';
        
        let html = `
            <strong>${conflictName}</strong>
            <div class="tooltip-divider"></div>
            <div>Date: ${formatDate(event.date)}</div>
            <div>Deaths: ${event.best.toLocaleString()}</div>
            <div>Type: ${getViolenceTypeLabel(event.type_of_violence)}</div>
            <div>Location: ${event.country}</div>
        `;
        
        tooltip
            .style('display', 'block')
            .html(html)
            .style('left', (leafletEvent.originalEvent.pageX + 10) + 'px')
            .style('top', (leafletEvent.originalEvent.pageY - 10) + 'px');
    }
    
    function hideTooltip() {
        tooltip.style('display', 'none');
    }
    
    // === Utility ===
    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Return public API
    return {
        update,
        highlightConflict,
        clearHighlights
    };
}