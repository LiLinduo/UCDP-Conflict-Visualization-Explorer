/* ========================================
   UCDP Conflict Visualization - Civilian Impact View
   Diverging Bar Chart (Civilian vs Combatant)
   ======================================== */

function initializeCivilianChart() {
    const container = d3.select('#civilian-chart');
    const margin = { top: 20, right: 40, bottom: 40, left: 200 };
    
    // Get dimensions
    function getDimensions() {
        const bbox = container.node().getBoundingClientRect();
        return {
            width: bbox.width - margin.left - margin.right,
            height: bbox.height - margin.top - margin.bottom
        };
    }
    
    let dims = getDimensions();
    
    // Create SVG
    const svg = container
        .attr('width', dims.width + margin.left + margin.right)
        .attr('height', dims.height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear().range([0, dims.width]);
    const yScale = d3.scaleBand().range([0, dims.height]).padding(0.1);
    
    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale);
    
    const xAxisGroup = g.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${dims.height})`);
    
    const yAxisGroup = g.append('g')
        .attr('class', 'axis y-axis');
    
    // Center line
    const centerLine = g.append('line')
        .attr('class', 'center-line')
        .attr('stroke', '#404040')
        .attr('stroke-width', 2)
        .attr('y1', 0)
        .attr('y2', dims.height);
    
    // Bars container
    const barsGroup = g.append('g').attr('class', 'bars');
    
    // Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('display', 'none');
    
    // === Update Function ===
    function update(filteredData) {
        // Get top 12 conflicts by civilian deaths
        let conflicts = [...filteredData.conflicts]
            .sort((a, b) => b.civilian_deaths - a.civilian_deaths)
            .slice(0, 12);
        
        if (conflicts.length === 0) {
            barsGroup.selectAll('.bar-group').remove();
            return;
        }
        
        // Find max value for symmetric scale
        const maxCivilian = d3.max(conflicts, d => d.civilian_deaths) || 1;
        const maxCombatant = d3.max(conflicts, d => d.combatant_deaths) || 1;
        const maxValue = Math.max(maxCivilian, maxCombatant);
        
        // Update scales
        xScale.domain([-maxValue, maxValue]);
        yScale.domain(conflicts.map(d => d.short_name || d.name));
        
        // Update axes
        xAxisGroup.transition().duration(500)
            .call(xAxis.tickFormat(d => Math.abs(d).toLocaleString()));
        
        yAxisGroup.transition().duration(500).call(yAxis);
        
        // Update center line
        centerLine
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y2', dims.height);
        
        // Bind data
        const barGroups = barsGroup.selectAll('.bar-group')
            .data(conflicts, d => d.id);
        
        // Exit
        barGroups.exit()
            .transition()
            .duration(300)
            .style('opacity', 0)
            .remove();
        
        // Enter
        const barGroupsEnter = barGroups.enter()
            .append('g')
            .attr('class', 'bar-group')
            .style('opacity', 0);
        
        // Merge
        const barGroupsMerged = barGroupsEnter.merge(barGroups);
        
        barGroupsMerged
            .on('click', (event, d) => {
                selectConflict(d.id);
            })
            .on('mouseover', (event, d) => {
                highlightConflict(d.id, 'civilian-chart');
                showTooltip(event, d);
            })
            .on('mouseout', () => {
                clearHighlights();
                tooltip.style('display', 'none');
            });
        
        // Civilian bars (left side, negative values)
        barGroupsEnter.append('rect')
            .attr('class', 'civilian-bar');
        
        barGroupsMerged.select('.civilian-bar')
            .transition()
            .duration(500)
            .attr('x', d => xScale(-d.civilian_deaths))
            .attr('y', d => yScale(d.short_name || d.name))
            .attr('width', d => xScale(0) - xScale(-d.civilian_deaths))
            .attr('height', yScale.bandwidth());
        
        // Combatant bars (right side, positive values)
        barGroupsEnter.append('rect')
            .attr('class', 'combatant-bar');
        
        barGroupsMerged.select('.combatant-bar')
            .transition()
            .duration(500)
            .attr('x', xScale(0))
            .attr('y', d => yScale(d.short_name || d.name))
            .attr('width', d => xScale(d.combatant_deaths) - xScale(0))
            .attr('height', yScale.bandwidth());
        
        // Fade in
        barGroupsMerged
            .transition()
            .duration(500)
            .style('opacity', 1);
    }
    
    // === Highlight Function ===
    function highlightConflict(conflictId) {
        barsGroup.selectAll('.bar-group')
            .classed('dimmed', d => d.id !== conflictId)
            .classed('highlighted', d => d.id === conflictId);
    }
    
    function clearHighlights() {
        barsGroup.selectAll('.bar-group')
            .classed('dimmed', false)
            .classed('highlighted', false);
    }
    
    // === Tooltip ===
    function showTooltip(event, d) {
        const civilianPct = Math.round((d.civilian_deaths / d.best) * 100);
        const combatantPct = Math.round((d.combatant_deaths / d.best) * 100);
        
        const html = `
            <strong>${d.name}</strong>
            <div class="tooltip-divider"></div>
            <div style="color: #f39c12">Civilian: ${d.civilian_deaths.toLocaleString()} (${civilianPct}%)</div>
            <div style="color: #95a5a6">Combatant: ${d.combatant_deaths.toLocaleString()} (${combatantPct}%)</div>
            <div>Total: ${d.best.toLocaleString()}</div>
            <div class="tooltip-divider"></div>
            <div>Duration: ${d.start_year} - ${d.end_year}</div>
            <div>Events: ${d.event_count.toLocaleString()}</div>
        `;
        
        tooltip
            .style('display', 'block')
            .html(html)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }
    
    // Handle resize
    window.addEventListener('resize', () => {
        dims = getDimensions();
        svg.attr('width', dims.width + margin.left + margin.right)
           .attr('height', dims.height + margin.top + margin.bottom);
        xScale.range([0, dims.width]);
        yScale.range([0, dims.height]);
        update({ conflicts: appData.conflicts });
    });
    
    // Return public API
    return {
        update,
        highlightConflict,
        clearHighlights
    };
}