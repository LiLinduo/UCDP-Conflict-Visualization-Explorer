/* ========================================
   UCDP Conflict Visualization - Timeline View
   Temporal Trends Stacked Area Chart
   ======================================== */

function initializeTimeline() {
    const container = d3.select('#timeline-chart');
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    
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
    const xScale = d3.scaleTime().range([0, dims.width]);
    const yScale = d3.scaleLinear().range([dims.height, 0]);
    
    // Axes - FIXED: Reduced ticks to prevent overlapping
    const xAxis = d3.axisBottom(xScale).ticks(6);
    const yAxis = d3.axisLeft(yScale).ticks(4);
    
    const xAxisGroup = g.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${dims.height})`);
    
    const yAxisGroup = g.append('g')
        .attr('class', 'axis y-axis');
    
    // REMOVED: Y-axis label (Deaths) - now in subtitle
    
    // Grid
    const gridGroup = g.append('g').attr('class', 'grid');
    
    // Area generator
    const area = d3.area()
        .x(d => xScale(d.data.date))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);
    
    // Stack generator
    const stack = d3.stack()
        .keys(['type_1', 'type_2', 'type_3'])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    
    // Areas container
    const areasGroup = g.append('g').attr('class', 'areas');
    
    // Tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('display', 'none');
    
    // Highlight band
    const highlightBand = g.append('rect')
        .attr('class', 'highlight-band')
        .attr('fill', '#f1c40f')
        .attr('opacity', 0)
        .attr('y', 0)
        .attr('height', dims.height);
    
    // === Update Function ===
    function update(filteredData) {
        // Aggregate data by month and type
        const monthlyData = aggregateByMonth(filteredData.monthly_deaths);
        
        if (monthlyData.length === 0) {
            areasGroup.selectAll('.timeline-area').remove();
            return;
        }
        
        // Update scales
        xScale.domain(d3.extent(monthlyData, d => d.date));
        yScale.domain([0, d3.max(monthlyData, d => d.type_1 + d.type_2 + d.type_3)]);
        
        // Update axes
        xAxisGroup.transition().duration(500).call(xAxis);
        yAxisGroup.transition().duration(500).call(yAxis);
        
        // Update grid
        gridGroup.selectAll('line').remove();
        gridGroup.selectAll('line')
            .data(yScale.ticks(4))
            .join('line')
            .attr('class', 'grid')
            .attr('x1', 0)
            .attr('x2', dims.width)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d));
        
        // Stack data
        const stackedData = stack(monthlyData);
        
        // Bind areas
        const areas = areasGroup.selectAll('.timeline-area')
            .data(stackedData, d => d.key);
        
        // Exit
        areas.exit()
            .transition()
            .duration(300)
            .style('opacity', 0)
            .remove();
        
        // Enter + Update
        const areasEnter = areas.enter()
            .append('path')
            .attr('class', d => `timeline-area ${getViolenceTypeClass(getTypeFromKey(d.key))}`)
            .style('opacity', 0);
        
        areasEnter.merge(areas)
            .on('mouseover', (event, d) => {
                const mouseX = d3.pointer(event, g.node())[0];
                const date = xScale.invert(mouseX);
                showTooltip(event, monthlyData, date);
            })
            .on('mousemove', (event, d) => {
                const mouseX = d3.pointer(event, g.node())[0];
                const date = xScale.invert(mouseX);
                showTooltip(event, monthlyData, date);
            })
            .on('mouseout', () => {
                tooltip.style('display', 'none');
            })
            .transition()
            .duration(500)
            .style('opacity', 0.7)
            .attr('d', area);
    }
    
    // === Highlight Function ===
    function highlightConflict(conflictId) {
        const conflict = appData.conflicts.find(c => c.id === conflictId);
        if (!conflict) return;
        
        const startDate = new Date(conflict.start_year, 0, 1);
        const endDate = new Date(conflict.end_year, 11, 31);
        
        highlightBand
            .attr('x', xScale(startDate))
            .attr('width', Math.max(0, xScale(endDate) - xScale(startDate)))
            .transition()
            .duration(200)
            .attr('opacity', 0.15);
    }
    
    function clearHighlights() {
        highlightBand
            .transition()
            .duration(200)
            .attr('opacity', 0);
    }
    
    // === Helper Functions ===
    function aggregateByMonth(data) {
        const monthMap = new Map();
        
        data.forEach(d => {
            const dateKey = `${d.year}-${d.month}`;
            if (!monthMap.has(dateKey)) {
                monthMap.set(dateKey, {
                    date: new Date(d.year, d.month - 1, 1),
                    type_1: 0,
                    type_2: 0,
                    type_3: 0
                });
            }
            const entry = monthMap.get(dateKey);
            entry[`type_${d.type}`] += d.deaths;
        });
        
        return Array.from(monthMap.values()).sort((a, b) => a.date - b.date);
    }
    
    function getTypeFromKey(key) {
        return parseInt(key.split('_')[1]);
    }
    
    function showTooltip(event, data, date) {
        // Find closest data point
        const bisect = d3.bisector(d => d.date).left;
        const index = bisect(data, date);
        const d = data[index] || data[data.length - 1];
        
        if (!d) return;
        
        const total = d.type_1 + d.type_2 + d.type_3;
        
        const html = `
            <strong>${formatMonthYear(d.date)}</strong>
            <div class="tooltip-divider"></div>
            <div>Total Deaths: ${total.toLocaleString()}</div>
            <div style="color: #3498db">State-based: ${d.type_1.toLocaleString()}</div>
            <div style="color: #e67e22">Non-state: ${d.type_2.toLocaleString()}</div>
            <div style="color: #9b59b6">One-sided: ${d.type_3.toLocaleString()}</div>
        `;
        
        tooltip
            .style('display', 'block')
            .html(html)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }
    
    function formatMonthYear(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    }
    
    // Handle resize
    window.addEventListener('resize', () => {
        dims = getDimensions();
        svg.attr('width', dims.width + margin.left + margin.right)
           .attr('height', dims.height + margin.top + margin.bottom);
        xScale.range([0, dims.width]);
        yScale.range([dims.height, 0]);
        update({ monthly_deaths: appData.monthly_deaths });
    });
    
    // Return public API
    return {
        update,
        highlightConflict,
        clearHighlights
    };
}