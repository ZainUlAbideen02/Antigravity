# 🚨 Disaster Evacuation Routing System (EVAC-NET)

## 📖 Project Overview
The **Disaster Evacuation Routing System** (also known as the *Intelligent Disaster-Evacuation Routing System*) is a real-time web-based simulation tool designed to help emergency managers visualize disaster spread and optimize evacuation strategies.

It simulates disasters (Earthquakes, Floods, Wildfires) in a dense urban environment (modeled after Islamabad) and calculates the safest evacuation routes for civilians to reach designated shelters using advanced pathfinding algorithms.

## ✨ Key Features
*   **Interactive City Map**: A detailed network of **60+ nodes** representing key locations in Islamabad (e.g., Faisal Mosque, F9 Park, Blue Area) connected by weighted edges.
*   **Real-Time Disaster Simulation**:
    *   Trigger disasters (Fire, Flood, Earthquake) at a specific epicenter.
    *   Dynamic spread of danger zones (red nodes) based on proximity and random propagation.
    *   Visual "ripple" effects and flashing alerts.
*   **Smart Evacuation Routing**:
    *   **Safest Route**: Calculates paths that strictly avoid high-risk/blocked zones.
    *   **Fastest Route**: Prioritizes speed over safety (not recommended during high risk).
    *   **Algorithm**: Uses **Dijkstra's Algorithm** with dynamic edge weighting (Risk + Distance).
*   **Crowd Simulation**:
    *   Visualizes civilians (particles) moving from populated areas to shelters in real-time.
    *   Tracks capacities of shelters (Occupancy vs. Capacity).
*   **Live Dashboard**:
    *   Metrics for **Evacuated**, **In Transit**, and **Casualties**.
    *   **Evacuation Efficiency** score.
    *   AI Recommendations based on current status.
*   **Audio Feedback**: Immersive sound effects for sirens, alerts, notifications, and success states.

## 🛠 Technology Stack

### Frontend (Active)
The core simulation runs entirely in the browser using:
*   **HTML5**: Structure and layout.
*   **CSS3**: Styling, animations, and responsive "HUD" design.
*   **JavaScript (Vanilla)**:
    *   **Canvas API**: High-performance rendering of the city map, graph connections, and particle system.
    *   **Web Audio API**: Real-time synthesized sound effects.
    *   **Logic**: Implementation of graph structures, Dijkstra's algorithm, and simulation loop.

### Backend (C++)
The project includes a high-performance C++ backend component located in the `backend/` directory.
*   **Language**: C++
*   **Networking**: Native Windows Sockets (Winsock2) for TCP/IP communication.
*   **Purpose**: Designed to serve as an API server (`server.exe`) that can handle heavy graph computations and serve map data.
*   **Current State**: The frontend (`app.js`) currently operates in **standalone** mode (client-side logic), but the backend exists as a robust alternative for server-side pathfinding.

## 📂 Project Structure

```
Antigravity/
├── frontend/               # Web Application
│   ├── css/
│   │   └── style.css       # HUD and layout styling
│   ├── js/
│   │   └── app.js          # Main simulation logic & rendering
│   └── index.html          # Entry point
│
├── backend/                # C++ Server Components
│   ├── src/
│   │   ├── server.cpp      # HTTP Server implementation
│   │   ├── router.cpp      # Dijkstra's algorithm implementation
│   │   └── main.cpp        # Entry point
│   └── include/            # Header files (Graph, Router, Server)
│
├── run.bat                 # Script to start the C++ backend server
├── build.bat               # Script to build the C++ project
└── DOCUMENTATION.md        # This file
```

## 🚀 How to Run

### Option 1: Standalone Simulation (Recommended)
1.  Navigate to the `frontend/` folder.
2.  Open **`index.html`** in any modern web browser (Chrome, Edge, Firefox).
3.  Click **"START MISSION"** to enter the Command Center.

### Option 2: Running with Backend
1.  Run **`run.bat`** in the root directory.
    *   This will start the C++ server on `localhost`.
    *   *Note: Requires C++ compiler environment (MinGW) if rebuilding.*
2.  Open `frontend/index.html`.

## 🎮 User Guide

1.  **Briefing**: Accept the mission briefing to load the map.
2.  **Navigation**:
    *   **Pan**: Click and drag on the map.
    *   **Zoom**: Use the mouse wheel.
3.  **Find a Route**:
    *   Select a **"Your Location"** from the dropdown menu (left panel).
    *   Click **"🛡️ FIND SAFEST ROUTE"**.
    *   Follow the green path and read the instructions.
4.  **Simulate Disaster**:
    *   Select **Disaster Type** (e.g., EARTHQUAKE).
    *   Click **"⚠️ TRIGGER DISASTER"**.
    *   **Click on the map** to set the Epicenter.
    *   Watch the disaster spread and civilians evacuate.
    *   Monitor the **Efficiency Meter** on the right.

## 🧠 Key Algorithms

### 1. Dijkstra's Algorithm (Pathfinding)
Used to find the shortest path from a start node to the nearest safe shelter.
*   **Standard Weight**: Physical distance between nodes.
*   **Risk Weight**: If a node is near the epicenter or "blocked", its edge weight is increased massively (infinity or +10000 cost), forcing the algorithm to find a detour.

### 2. Risk Propagation Model
*   **Epicenter**: Max risk (100%).
*   **Proximity**: Risk decreases linearly with distance from the epicenter.
*   **Spread**: Every few seconds, the disaster spreads to neighboring nodes based on a probabilistic model (`Math.random() < 0.35`).

---
*Documentation generated by Antigravity AI.*
