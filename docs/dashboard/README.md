# Local Dashboard

VulneraScan includes a presentation-oriented dashboard interface to aggregate scan outputs, browse workspace runs, inspect package dependencies, and analyze vulnerability histories.

## Running the Dashboard

To run the local dashboard, execute the dashboard start command:

```bash
vulnerascan dashboard
```

This starts a local dashboard web server (defaulting to `http://localhost:3000`) and serves the React/Vite-based user interface.

## User Interface Features

- **Global Overview**: Summary dashboard showcasing statistics on all projects, vulnerability distribution by severity, and recent scans.
- **Project Drilldowns**: Inspect details of a specific project registered in the workspace system.
- **Run Timeline**: Timeline list of historic scans to review regressions and improvements.
- **Interactive Graphs**: View dependency hierarchies and trace paths from the root project down to a vulnerable dependency.
