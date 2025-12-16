/* ========================================
   UCDP Conflict Visualization - Uncertainty View
   Error Bar Chart (Low - Best - High)
   ======================================== */

function initializeUncertaintyChart() {
    const container = d3.select('#uncertainty-chart');
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
    let useLogScale = true;
    
    // Create SVG
    const svg = container
        .attr('width', dims.width + margin.left + margin.right)
        .attr('height', dims.height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    let xScale = d3.scaleLog().range([0, dims.width]).clamp(true);
    const yScale = d3.scaleBand().range([0, dims.height]).padding(0.15);
    
    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale);
    
    const xAxisGroup = g.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${dims.height})`);
    
    const yAxisGroup = g.append('g')
        .attr('class', 'axis y-axis');
    
    // Axis label
    xAxisGroup.append('text')
        .attr('class', 'axis-label')
        .attr('x', dims.width / 2)
        .attr('y', 35)
        .attr('fill', '#b0b0b0')
        .style('text-anchor', 'middle')
        .style('font-size', '0.85rem')
        .text('Estimated Deaths');
    
    // Grid
    const gridGroup = g.append('g').attr('class', 'grid');
    
    // Uncertainty groups container
    const uncertaintyGroup = g.append('g').attr('class', 'uncertainty-groups');
    
    // Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('display', 'none');
    
    // Log scale toggle
    const logToggle = document.getElementById('log-scale-toggle');
    if (logToggle) {
        logToggle.checked = true;
        logToggle.addEventListener('change', (e) => {
            useLogScale = e.target.checked;
            update({ conflicts: appData.conflicts });
        });
    }
    
    // === Update Function ===
    function update(filteredData) {
        // Get top 12 conflicts by uncertainty width
        let conflicts = [...filteredData.conflicts]
            .map(d => ({
                ...d,
                uncertainty_width: d.high - d.low,
                relative_uncertainty: (d.high - d.low) / d.best
            }))
            .sort((a, b) => b.uncertainty_width - a.uncertainty_width)
            .slice(0, 12);
        
        if (conflicts.length === 0) {
            uncertaintyGroup.selectAll('.uncertainty-group').remove();
            return;
        }
        
        // Update scale type
        if (useLogScale) {
            xScale = d3.scaleLog()
                .range([0, dims.width])
                .clamp(true);
        } else {
            xScale = d3.scaleLinear()
                .range([0, dims.width]);
        }
        
        // Update scales
        const maxHigh = d3.max(conflicts, d => d.high) || 1;
        const minLow = Math.max(1, d3.min(conflicts, d => d.low) || 1);
        
        xScale.domain([useLogScale ? minLow : 0, maxHigh]);
        yScale.domain(conflicts.map(d => d.short_name || d.name));
        
        // Update axes
        xAxisGroup.transition().duration(500)
            .call(xAxis.tickFormat(d => d.toLocaleString()));
        
        yAxisGroup.transition().duration(500).call(yAxis);
        
        // Update grid
        gridGroup.selectAll('line').remove();
        gridGroup.selectAll('line')
            .data(xScale.ticks(6))
            .join('line')
            .attr('class', 'grid')
            .attr('x1', d => xScale(d))
            .attr('x2', d => xScale(d))
            .attr('y1', 0)
            .attr('y2', dims.height);
        
        // Bind data
        const groups = uncertaintyGroup.selectAll('.uncertainty-group')
            .data(conflicts, d => d.id);
        
        // Exit
        groups.exit()
            .transition()
            .duration(300)
            .style('opacity', 0)
            .remove();
        
        // Enter
        const groupsEnter = groups.enter()
            .append('g')
            .attr('class', d => `uncertainty-group ${getViolenceTypeClass(d.violence_type)}`)
            .style('opacity', 0);
        
        // Merge
        const groupsMerged = groupsEnter.merge(groups);
        
        groupsMerged
            .on('click', (event, d) => {
                selectConflict(d.id);
            })
            .on('mouseover', (event, d) => {
                highlightConflict(d.id, 'uncertainty-chart');
                showTooltip(event, d);
            })
            .on('mouseout', () => {
                clearHighlights();
                tooltip.style('display', 'none');
            });
        
        // Error lines
        groupsEnter.append('line')
            .attr('class', d => `uncertainty-line ${getViolenceTypeClass(d.violence_type)}`);
        
        groupsMerged.select('.uncertainty-line')
            .transition()
            .duration(500)
            .attr('x1', d => xScale(Math.max(1, d.low)))
            .attr('x2', d => xScale(d.high))
            .attr('y1', d => yScale(d.short_name || d.name) + yScale.bandwidth() / 2)
            .attr('y2', d => yScale(d.short_name || d.name) + yScale.bandwidth() / 2);
        
        // Low cap
        groupsEnter.append('line')
            .attr('class', 'uncertainty-cap');
        
        groupsMerged.selectAll('.uncertainty-cap:first-of-type')
            .transition()
            .duration(500)
            .attr('x1', d => xScale(Math.max(1, d.low)))
            .attr('x2', d => xScale(Math.max(1, d.low)))
            .attr('y1', d => yScale(d.short_name || d.name) + yScale.bandwidth() * 0.3)
            .attr('y2', d => yScale(d.short_name || d.name) + yScale.bandwidth() * 0.7)
            .attr('stroke', '#707070')
            .attr('stroke-width', 2);
        
        // High cap
        groupsEnter.append('line')
            .attr('class', 'uncertainty-cap');
        
        groupsMerged.selectAll('.uncertainty-cap:last-of-type')
            .transition()
            .duration(500)
            .attr('x1', d => xScale(d.high))
            .attr('x2', d => xScale(d.high))
            .attr('y1', d => yScale(d.short_name || d.name) + yScale.bandwidth() * 0.3)
            .attr('y2', d => yScale(d.short_name || d.name) + yScale.bandwidth() * 0.7)
            .attr('stroke', '#707070')
            .attr('stroke-width', 2);
        
        // Best estimate point
        groupsEnter.append('circle')
            .attr('class', d => `uncertainty-point ${getViolenceTypeClass(d.violence_type)}`)
            .attr('r', 5);
        
        groupsMerged.select('.uncertainty-point')
            .transition()
            .duration(500)
            .attr('cx', d => xScale(d.best))
            .attr('cy', d => yScale(d.short_name || d.name) + yScale.bandwidth() / 2);
        
        // Fade in
        groupsMerged
            .transition()
            .duration(500)
            .style('opacity', 1);
    }
    
    // === Highlight Function ===
    function highlightConflict(conflictId) {
        uncertaintyGroup.selectAll('.uncertainty-group')
            .classed('dimmed', d => d.id !== conflictId)
            .classed('highlighted', d => d.id === conflictId);
    }
    
    function clearHighlights() {
        uncertaintyGroup.selectAll('.uncertainty-group')
            .classed('dimmed', false)
            .classed('highlighted', false);
    }
    
    // === Tooltip ===
    function showTooltip(event, d) {
        const uncertaintyPct = Math.round((d.uncertainty_width / d.best) * 100);
        
        let confidence = 'Low';
        if (uncertaintyPct < 20) confidence = 'High';
        else if (uncertaintyPct < 50) confidence = 'Moderate';
        
        const html = `
            <strong>${d.name}</strong>
            <div class="tooltip-divider"></div>
            <div>Best Estimate: ${d.best.toLocaleString()}</div>
            <div>Low Estimate: ${d.low.toLocaleString()}</div>
            <div>High Estimate: ${d.high.toLocaleString()}</div>
            <div class="tooltip-divider"></div>
            <div>Uncertainty Range: ${d.uncertainty_width.toLocaleString()}</div>
            <div>Relative Uncertainty: ${uncertaintyPct}%</div>
            <div>Confidence: <strong>${confidence}</strong></div>
        `;
        
        tooltip
            .style('display', 'block')
            .html(html);
        
        // Get tooltip dimensions after content is set
        const tooltipNode = tooltip.node();
        const tooltipHeight = tooltipNode.offsetHeight;
        
        // Position tooltip above and to the right of cursor
        tooltip
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - tooltipHeight - 15) + 'px');
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