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
    
    // Add tile layer - CartoDB Dark Matter with Labels
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(map);
    
    // Marker cluster group with custom icon creation
    const markers = L.markerClusterGroup({
        maxClusterRadius: (zoom) => {
            return Math.max(40, 80 - (zoom * 5));
        },
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            // Get all markers in this cluster
            const childMarkers = cluster.getAllChildMarkers();
            
            // Count violence types
            const typeCounts = { 1: 0, 2: 0, 3: 0 };
            childMarkers.forEach(marker => {
                if (marker.violenceType) {
                    typeCounts[marker.violenceType]++;
                }
            });
            
            // Find dominant type
            let dominantType = 1;
            let maxCount = typeCounts[1];
            if (typeCounts[2] > maxCount) {
                dominantType = 2;
                maxCount = typeCounts[2];
            }
            if (typeCounts[3] > maxCount) {
                dominantType = 3;
                maxCount = typeCounts[3];
            }
            
            // Get class for dominant type
            const typeClass = getViolenceTypeClass(dominantType);
            
            // Get count
            const count = cluster.getChildCount();
            
            // Determine size based on count
            let size = 'small';
            if (count >= 100) size = 'large';
            else if (count >= 10) size = 'medium';
            
            // Create custom icon
            return L.divIcon({
                html: `<div class="cluster-inner"><span>${count}</span></div>`,
                className: `marker-cluster marker-cluster-${size} cluster-${typeClass}`,
                iconSize: L.point(40, 40)
            });
        }
    });
    
    markers.on('clusterclick', function(cluster) {
        const childMarkers = cluster.layer.getAllChildMarkers();
        
        // Count events per conflict
        const conflictCounts = {};
        childMarkers.forEach(marker => {
            if (marker.conflictId) {
                conflictCounts[marker.conflictId] = (conflictCounts[marker.conflictId] || 0) + 1;
            }
        });
        
        // Find dominant conflict (most events in this cluster)
        let dominantConflictId = null;
        let maxEvents = 0;
        for (const [conflictId, count] of Object.entries(conflictCounts)) {
            if (count > maxEvents) {
                maxEvents = count;
                dominantConflictId = parseInt(conflictId);
            }
        }
        
        // Show conflict details if found one
        if (dominantConflictId) {
            selectConflict(dominantConflictId);
        }
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
            
            // Store conflict ID and violence type for reference
            marker.conflictId = event.conflict_id;
            marker.violenceType = event.type_of_violence;
            
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