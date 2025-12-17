# UCDP Conflict Visualization Explorer

An interactive dashboard for exploring armed conflict data from the Uppsala Conflict Data Program Georeferenced Event Dataset (UCDP GED). This coordinated multiple views visualization enables spatial, temporal, humanitarian, and uncertainty analysis of conflicts from 1989-2024.

**🔗 [Live Demo](https://lilinduo.github.io/UCDP-Conflict-Visualization-Explorer/)**

## Features

The dashboard provides four coordinated visualizations:

- **Interactive Map**: Geographic distribution of conflict events with marker clustering, sized by casualty estimates and colored by violence type
- **Temporal Trends**: Stacked area chart showing how violence composition evolves over time
- **Civilian Impact**: Diverging bar chart comparing civilian versus combatant casualties for top conflicts
- **Uncertainty Visualization**: Error bars revealing the reliability of death toll estimates with configurable log/linear scale

All views are linked through coordinated filtering and highlighting, enabling multi-dimensional exploration of conflict patterns.

## Data Aggregation

The visualization uses pre-processed JSON files derived from the UCDP GED dataset:

### Source Data
- **UCDP GED**: Individual georeferenced conflict events (1989-2024)
- Each event includes: location, date, violence type, actors, and three death estimates (low/best/high)

### Aggregation Pipeline

**Conflict-Level Summary** (`conflicts_summary.json`)
- Groups events by conflict ID
- Sums death estimates (low/best/high) across all events
- Computes civilian vs. combatant breakdown
- Calculates conflict duration, event counts, and uncertainty metrics

**Monthly Temporal Data** (`monthly_deaths_by_type.json`)
- Aggregates deaths by year, month, and violence type
- Enables efficient timeline rendering without daily granularity

**Sampled Events** (`events_sample.json`)
- Stratified sample of ~10,000 events (from ~400,000 total)
- Maintains temporal coverage while optimizing map performance
- Preserves geographic distribution across regions

### Violence Type Classification
1. **State-based** (Type 1): Government vs. armed group conflicts
2. **Non-state** (Type 2): Armed group vs. armed group conflicts  
3. **One-sided** (Type 3): Organized attacks against civilians

## Technology Stack

- **D3.js v7**: Custom charts and visualizations
- **Leaflet.js**: Interactive mapping with marker clustering
- **Vanilla JavaScript**: No framework dependencies
- **Static Site**: Client-side only, deployable to GitHub Pages

## Project Structure

```
.
├── index.html              # Main dashboard page
├── css/
│   └── style.css           # Styling and layout
├── js/
│   ├── main.js             # State management and coordination
│   ├── map-view.js         # Spatiotemporal map implementation
│   ├── timeline-view.js    # Temporal trends chart
│   ├── civilian-view.js    # Civilian impact diverging bars
│   └── uncertainty-view.js # Uncertainty error bars
└── data/
    ├── conflicts_summary.json      # Conflict-level aggregates
    ├── monthly_deaths_by_type.json # Time series data
    ├── events_sample.json          # Sampled event locations
    └── data_summary.json           # Metadata
```

## Usage

- **Time Filtering**: Adjust the dual-handle slider to focus on specific years
- **Violence Type**: Click legend items to toggle violence types on/off
- **Spatial Exploration**: Pan/zoom the map, click markers for event details
- **Cross-View Highlighting**: Hover over elements to highlight related data across all views
- **Detail Panel**: Click on conflicts or events to view detailed information

## Data Source

This visualization uses data from:
- **UCDP Georeferenced Event Dataset (GED)**: [https://ucdp.uu.se/downloads/index.html#ged_global](https://ucdp.uu.se/downloads/index.html#ged_global)

## Author

LI Linduo

## Acknowledgments

- Uppsala Conflict Data Program for the comprehensive dataset
- Leaflet.js and D3.js communities for excellent visualization libraries