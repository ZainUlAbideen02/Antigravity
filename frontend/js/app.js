// REAL DISASTER EVACUATION SYSTEM
// Dense network + Smart routing + Clear goals + Sound FX

const canvas = document.getElementById('city-map');
const ctx = canvas.getContext('2d');

// Global Error Handler
window.onerror = function (msg, url, line, col, error) {
    const log = document.getElementById('sys-log');
    if (log) {
        const p = document.createElement('p');
        p.style.color = '#ff0033';
        p.textContent = `❌ ERROR: ${msg} (Line ${line})`;
        log.appendChild(p);
    }
    return false;
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const NODE_RADIUS = 6;
let nodes = [];
let edges = [];
let currentRoutes = []; // Multiple routes
let particles = []; // Crowd simulation agents
let GRID_SCALE = 1.8;
let offsetX = canvas.width / 2 - 400, offsetY = canvas.height / 2 - 250;
let zoomLevel = 1.0;
const MIN_ZOOM = 0.5, MAX_ZOOM = 3.0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0, dragOffsetX = 0, dragOffsetY = 0;
let hoveredNode = null;

// Evacuation state
let disasterActive = false;
let disasterType = 'none';
let blockedNodes = new Set();
let disasterEpicenter = null;
let evacuationTimeLeft = 600;
let timerInterval = null, spreadInterval = null;

// === SOUND SYSTEM ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;

const sounds = {
    // Emergency siren (disaster trigger)
    siren: () => {
        if (!soundEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();

        // Oscillating siren effect
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1);

        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.stop(audioCtx.currentTime + 1.2);
    },

    // Alert beep (disaster spread)
    alert: () => {
        if (!soundEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 1200;
        osc.type = 'sine';
        gain.gain.value = 0.2;
        osc.start();

        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.stop(audioCtx.currentTime + 0.15);
    },

    // Warning (high casualties)
    warning: () => {
        if (!soundEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 600;
        osc.type = 'sawtooth';
        gain.gain.value = 0.25;
        osc.start();

        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.stop(audioCtx.currentTime + 0.3);
    },

    // Success (evacuation milestone)
    success: () => {
        if (!soundEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 523; // C note
        osc.type = 'sine';
        gain.gain.value = 0.15;
        osc.start();

        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1); // E note
        osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2); // G note

        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.stop(audioCtx.currentTime + 0.4);
    },

    // Blip (UI interaction)
    blip: () => {
        if (!soundEnabled) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 2000;
        osc.type = 'sine';
        gain.gain.value = 0.1;
        osc.start();

        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.stop(audioCtx.currentTime + 0.05);
    },

    // Ambient alarm (looping)
    ambientAlarm: null,
    startAmbient: () => {
        if (!soundEnabled || sounds.ambientAlarm) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();

        lfo.frequency.value = 0.5; // Slow oscillation
        lfoGain.gain.value = 50;

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.frequency.value = 200;
        osc.type = 'triangle';
        gain.gain.value = 0.05;

        lfo.start();
        osc.start();

        sounds.ambientAlarm = { osc, lfo, gain };
    },
    stopAmbient: () => {
        if (sounds.ambientAlarm) {
            try {
                sounds.ambientAlarm.gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                sounds.ambientAlarm.osc.stop(audioCtx.currentTime + 0.5);
                sounds.ambientAlarm.lfo.stop(audioCtx.currentTime + 0.5);
            } catch (e) { }
            sounds.ambientAlarm = null;
        }
    }
};

// Metrics
let stats = {
    totalEvacuees: 500,
    evacuated: 0,
    inTransit: 0,
    casualties: 0,
    routesCalculated: 0
};

// Dense Islamabad node network (60+ nodes)
function loadNodes() {
    nodes = [
        // Core shelters
        { id: 'faisal_mosque', x: 200, y: 50, shelter: true, cap: 1000, occ: 0, pop: 0 },
        { id: 'rawal_lake', x: 100, y: 100, shelter: true, cap: 800, occ: 0, pop: 0 },
        { id: 'f9_park', x: 350, y: 250, shelter: true, cap: 1500, occ: 0, pop: 0 },
        { id: 'shakarparian', x: 420, y: 190, shelter: true, cap: 1200, occ: 0, pop: 0 },
        { id: 'pak_monument', x: 180, y: 140, shelter: true, cap: 900, occ: 0, pop: 0 },
        { id: 'lake_view_park', x: 280, y: 320, shelter: true, cap: 700, occ: 0, pop: 0 },

        // Residential/Commercial (populated areas)
        { id: 'blue_area', x: 210, y: 160, shelter: false, cap: 0, occ: 0, pop: 800 },
        { id: 'aabpara', x: 190, y: 180, shelter: false, cap: 0, occ: 0, pop: 600 },
        { id: 'jinnah_super', x: 230, y: 200, shelter: false, cap: 0, occ: 0, pop: 700 },
        { id: 'f6', x: 260, y: 180, shelter: false, cap: 0, occ: 0, pop: 650 },
        { id: 'f7', x: 300, y: 200, shelter: false, cap: 0, occ: 0, pop: 750 },
        { id: 'f8', x: 340, y: 220, shelter: false, cap: 0, occ: 0, pop: 680 },
        { id: 'f10', x: 400, y: 280, shelter: false, cap: 0, occ: 0, pop: 620 },
        { id: 'f11', x: 440, y: 300, shelter: false, cap: 0, occ: 0, pop: 580 },
        { id: 'g6', x: 210, y: 230, shelter: false, cap: 0, occ: 0, pop: 720 },
        { id: 'g7', x: 250, y: 250, shelter: false, cap: 0, occ: 0, pop: 690 },
        { id: 'g8', x: 290, y: 270, shelter: false, cap: 0, occ: 0, pop: 710 },
        { id: 'g9', x: 330, y: 290, shelter: false, cap: 0, occ: 0, pop: 640 },
        { id: 'g10', x: 370, y: 310, shelter: false, cap: 0, occ: 0, pop: 600 },
        { id: 'g11', x: 410, y: 330, shelter: false, cap: 0, occ: 0, pop: 560 },
        { id: 'g13', x: 470, y: 360, shelter: false, cap: 0, occ: 0, pop: 520 },
        { id: 'h8', x: 180, y: 250, shelter: false, cap: 0, occ: 0, pop: 580 },
        { id: 'h9', x: 220, y: 270, shelter: false, cap: 0, occ: 0, pop: 610 },
        { id: 'h10', x: 260, y: 290, shelter: false, cap: 0, occ: 0, pop: 590 },
        { id: 'h11', x: 300, y: 310, shelter: false, cap: 0, occ: 0, pop: 570 },
        { id: 'i8', x: 150, y: 280, shelter: false, cap: 0, occ: 0, pop: 550 },
        { id: 'i9', x: 190, y: 300, shelter: false, cap: 0, occ: 0, pop: 580 },
        { id: 'i10', x: 230, y: 320, shelter: false, cap: 0, occ: 0, pop: 560 },
        { id: 'i11', x: 270, y: 340, shelter: false, cap: 0, occ: 0, pop: 540 },

        // Additional areas
        { id: 'zero_point', x: 320, y: 150, shelter: false, cap: 0, occ: 0, pop: 450 },
        { id: 'faizabad', x: 360, y: 170, shelter: false, cap: 0, occ: 0, pop: 480 },
        { id: 'centaurus', x: 270, y: 220, shelter: false, cap: 0, occ: 0, pop: 520 },
        { id: 'melody', x: 200, y: 190, shelter: false, cap: 0, occ: 0, pop: 490 },
        { id: 'pwd', x: 250, y: 290, shelter: false, cap: 0, occ: 0, pop: 510 },
        { id: 'daman_koh', x: 260, y: 80, shelter: false, cap: 0, occ: 0, pop: 300 },
        { id: 'pir_sohawa', x: 320, y: 60, shelter: false, cap: 0, occ: 0, pop: 280 },
        { id: 'saidpur', x: 160, y: 90, shelter: false, cap: 0, occ: 0, pop: 350 },
        { id: 'quaid_uni', x: 110, y: 150, shelter: false, cap: 0, occ: 0, pop: 900 },
        { id: 'nust', x: 140, y: 190, shelter: false, cap: 0, occ: 0, pop: 1100 },
        { id: 'pims', x: 210, y: 240, shelter: false, cap: 0, occ: 0, pop: 400 },

        // DHA/Bahria
        { id: 'dha1', x: 320, y: 360, shelter: false, cap: 0, occ: 0, pop: 780 },
        { id: 'dha2', x: 370, y: 380, shelter: false, cap: 0, occ: 0, pop: 820 },
        { id: 'bahria', x: 450, y: 390, shelter: false, cap: 0, occ: 0, pop: 950 },

        // Outer areas
        { id: 'pwd_housing', x: 230, y: 310, shelter: false, cap: 0, occ: 0, pop: 480 },
        { id: 'e11', x: 130, y: 340, shelter: false, cap: 0, occ: 0, pop: 520 },
        { id: 'rawat', x: 500, y: 350, shelter: false, cap: 0, occ: 0, pop: 460 },
        { id: 'kachnar', x: 180, y: 260, shelter: false, cap: 0, occ: 0, pop: 380 },
        { id: 'rose_garden', x: 225, y: 265, shelter: false, cap: 0, occ: 0, pop: 360 },

        // Additional nodes for density
        { id: 'f6_1', x: 245, y: 170, shelter: false, cap: 0, occ: 0, pop: 420 },
        { id: 'f7_1', x: 285, y: 190, shelter: false, cap: 0, occ: 0, pop: 440 },
        { id: 'g6_1', x: 195, y: 220, shelter: false, cap: 0, occ: 0, pop: 410 },
        { id: 'g7_1', x: 235, y: 240, shelter: false, cap: 0, occ: 0, pop: 430 },
        { id: 'i8_1', x: 135, y: 270, shelter: false, cap: 0, occ: 0, pop: 390 },
        { id: 'sector_d', x: 95, y: 310, shelter: false, cap: 0, occ: 0, pop: 500 },
        { id: 'bhara_kahu', x: 380, y: 70, shelter: false, cap: 0, occ: 0, pop: 480 },
        { id: 'golra', x: 80, y: 230, shelter: false, cap: 0, occ: 0, pop: 520 },
        { id: 'tarnol', x: 50, y: 270, shelter: false, cap: 0, occ: 0, pop: 440 },
        { id: 'bani_gala', x: 520, y: 120, shelter: false, cap: 0, occ: 0, pop: 380 },
        { id: 'margalla', x: 240, y: 40, shelter: false, cap: 0, occ: 0, pop: 250 },
    ];

    // Create dense edge network
    edges = [];
    const connections = [
        // Main arteries
        ['faisal_mosque', 'daman_koh', 50], ['daman_koh', 'pir_sohawa', 40], ['daman_koh', 'zero_point', 60],
        ['faisal_mosque', 'saidpur', 45], ['saidpur', 'rawal_lake', 35], ['rawal_lake', 'quaid_uni', 50],
        ['quaid_uni', 'pak_monument', 40], ['pak_monument', 'blue_area', 35], ['blue_area', 'aabpara', 25],
        ['aabpara', 'melody', 20], ['melody', 'jinnah_super', 30], ['jinnah_super', 'f6', 35],
        ['f6', 'f7', 40], ['f7', 'f8', 45], ['f8', 'f9_park', 40], ['f9_park', 'f10', 45], ['f10', 'f11', 40],

        // G sectors
        ['blue_area', 'g6', 40], ['g6', 'g7', 35], ['g7', 'g8', 35], ['g8', 'g9', 35],
        ['g9', 'g10', 35], ['g10', 'g11', 35], ['g11', 'g13', 40],

        // H sectors
        ['g6', 'h8', 40], ['h8', 'h9', 30], ['h9', 'h10', 30], ['h10', 'h11', 30],
        ['g7', 'h9', 35], ['g8', 'h10', 35], ['g9', 'h11', 35],

        // I sectors
        ['h8', 'i8', 30], ['i8', 'i9', 30], ['i9', 'i10', 30], ['i10', 'i11', 30],
        ['h9', 'i9', 30], ['h10', 'i10', 30], ['h11', 'i11', 30],

        // Cross connections
        ['jinnah_super', 'centaurus', 30], ['centaurus', 'g6', 35], ['centaurus', 'g7', 30],
        ['f7', 'centaurus', 40], ['f7', 'zero_point', 45], ['zero_point', 'faizabad', 40],
        ['faizabad', 'shakarparian', 45], ['shakarparian', 'f9_park', 50],

        // University areas
        ['quaid_uni', 'nust', 35], ['nust', 'aabpara', 40], ['nust', 'golra', 60],

        // PWD connections
        ['g8', 'pwd', 30], ['pwd', 'pwd_housing', 25], ['pwd', 'rose_garden', 20],
        ['h9', 'rose_garden', 25], ['h8', 'kachnar', 30], ['kachnar', 'rose_garden', 20],
        ['g7', 'pims', 30], ['pims', 'g6', 25], ['pims', 'h9', 30],

        // DHA/Bahria
        ['g10', 'dha1', 40], ['dha1', 'dha2', 35], ['dha2', 'bahria', 50],
        ['g11', 'dha1', 45], ['g11', 'dha2', 40], ['g13', 'bahria', 45], ['bahria', 'rawat', 55],
        ['h11', 'dha1', 45], ['i10', 'pwd_housing', 35], ['i11', 'lake_view_park', 40],
        ['g9', 'lake_view_park', 35], ['h10', 'lake_view_park', 30],

        // Outer connections
        ['i8', 'e11', 45], ['e11', 'sector_d', 40], ['sector_d', 'tarnol', 35],
        ['i8', 'golra', 50], ['golra', 'tarnol', 40],
        ['pir_sohawa', 'bhara_kahu', 55], ['bhara_kahu', 'bani_gala', 80],
        ['faizabad', 'bani_gala', 90], ['margalla', 'faisal_mosque', 35],
        ['margalla', 'daman_koh', 30],

        // Additional cross-links for redundancy
        ['f6', 'f6_1', 15], ['f6_1', 'f7', 20], ['f7', 'f7_1', 15], ['f7_1', 'f8', 20],
        ['g6', 'g6_1', 15], ['g6_1', 'g7', 20], ['g7', 'g7_1', 15], ['g7_1', 'g8', 20],
        ['i8', 'i8_1', 15], ['i8_1', 'i9', 20],
        ['f6_1', 'centaurus', 25], ['g6_1', 'h8', 25], ['g7_1', 'pwd', 25],
    ];

    connections.forEach(([from, to, dist]) => {
        edges.push({ from, to, dist, risk: 0 });
    });

    logToConsole(`✓ ${nodes.length} nodes | ${edges.length} connections loaded`);

    // Populate User Location Dropdown
    const userLocSelect = document.getElementById('user-location');
    if (userLocSelect) {
        // Clear existing options (except first)
        while (userLocSelect.options.length > 1) userLocSelect.remove(1);

        nodes.sort((a, b) => a.id.localeCompare(b.id)).forEach(node => {
            const opt = document.createElement('option');
            opt.value = node.id;
            opt.textContent = node.id.toUpperCase();
            userLocSelect.appendChild(opt);
        });
    }
}

function spawnParticles(fromId, toId, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            from: fromId,
            to: toId,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02, // Random speed
            offset: (Math.random() - 0.5) * 4 // Jitter for "crowd" width
        });
    }
}

// Dynamic Risk Calculation
function updateRisk() {
    if (!disasterActive || !disasterEpicenter) return;

    const epicNode = nodes.find(n => n.id === disasterEpicenter);
    if (!epicNode) return;

    nodes.forEach(node => {
        // Distance to epicenter
        const dx = node.x - epicNode.x;
        const dy = node.y - epicNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Risk score: Higher if closer to epicenter
        // Base risk: 0 to 100
        let risk = 0;
        if (dist < 300) {
            risk = (300 - dist) / 3; // Max 100 at epicenter
        }

        // Add risk from blocked neighbors
        edges.filter(e => e.from === node.id || e.to === node.id).forEach(e => {
            const neighborId = e.from === node.id ? e.to : e.from;
            if (blockedNodes.has(neighborId)) {
                risk += 50;
            }
        });

        node.risk = Math.min(risk, 1000); // Cap risk
    });
}
function dijkstra(startId, endId, avoidBlocked = true) {
    const dist = {};
    const prev = {};
    const unvisited = new Set();

    nodes.forEach(n => {
        dist[n.id] = Infinity;
        prev[n.id] = null;
        unvisited.add(n.id);
    });

    dist[startId] = 0;

    while (unvisited.size > 0) {
        let current = null;
        let minDist = Infinity;

        unvisited.forEach(id => {
            if (dist[id] < minDist) {
                minDist = dist[id];
                current = id;
            }
        });

        if (current === null || current === endId) break;
        unvisited.delete(current);

        // Get neighbors
        const neighbors = edges
            .filter(e => e.from === current || e.to === current)
            .map(e => ({
                id: e.from === current ? e.to : e.from,
                dist: e.dist,
                risk: e.risk
            }));

        neighbors.forEach(({ id, dist: edgeDist, risk }) => {
            if (!unvisited.has(id)) return;
            if (avoidBlocked && blockedNodes.has(id)) return; // Avoid blocked

            // Weight: distance + risk penalty
            // If useRiskWeights is true, add heavy penalty for high risk nodes
            let weight = edgeDist;
            if (avoidBlocked) { // "Safest" mode implies avoidBlocked=true usually, but let's be explicit
                const neighborNode = nodes.find(n => n.id === id);
                if (neighborNode && neighborNode.risk > 0) {
                    weight += neighborNode.risk * 20; // Heavy penalty for risk
                }
            }

            // Standard blocked penalty
            if (blockedNodes.has(id)) weight += 10000;

            const alt = dist[current] + weight;

            if (alt < dist[id]) {
                dist[id] = alt;
                prev[id] = current;
            }
        });
    }

    // Reconstruct path
    const path = [];
    let current = endId;
    while (current) {
        path.unshift(current);
        current = prev[current];
    }

    return path.length > 1 ? { path, distance: dist[endId] } : null;
}

// Calculate 3 routes: fastest, safest, balanced
function calculateMultipleRoutes(fromId, toId) {
    currentRoutes = [];

    // Route 1: Fastest (ignore some risk)
    const fastest = dijkstra(fromId, toId, false);
    if (fastest) {
        currentRoutes.push({ ...fastest, type: 'FASTEST', color: '#00ffff' });
    }

    // Route 2: Safest (strongly avoid blocked)
    const safest = dijkstra(fromId, toId, true);
    if (safest) {
        currentRoutes.push({ ...safest, type: 'SAFEST', color: '#0fff00' });
    }

    stats.routesCalculated = currentRoutes.length;
    return currentRoutes;
}

// Find Safest Route for User
function findSafestRoute(startId) {
    if (!disasterActive) {
        logToConsole("⚠ NO DISASTER ACTIVE");
        return;
    }

    // Find all safe shelters
    const shelters = nodes.filter(n => n.shelter && !blockedNodes.has(n.id));
    if (shelters.length === 0) {
        logToConsole("❌ NO SAFE SHELTERS!");
        return;
    }

    let safestRoute = null;
    let minRiskScore = Infinity;

    shelters.forEach(shelter => {
        // Use risk-weighted Dijkstra
        const route = dijkstra(startId, shelter.id, true);
        if (route) {
            // Calculate total path risk
            let pathRisk = 0;
            route.path.forEach(nodeId => {
                const n = nodes.find(node => node.id === nodeId);
                if (n) pathRisk += n.risk || 0;
            });

            // Normalize by distance to favor shorter safe paths
            const score = route.distance + (pathRisk * 50);

            if (score < minRiskScore) {
                minRiskScore = score;
                safestRoute = route;
            }
        }
    });

    if (safestRoute) {
        currentRoutes = [{ ...safestRoute, type: 'SAFEST', color: '#27ae60' }]; // Professional Green
        logToConsole(`✓ SAFEST ROUTE FOUND: ${(safestRoute.distance / 10).toFixed(1)}km`);
        sounds.blip();

        displayRouteDetails(safestRoute);
    } else {
        logToConsole("❌ NO SAFE ROUTE FOUND");
        document.getElementById('route-info-panel').style.display = 'none';
    }
}

function displayRouteDetails(route) {
    const panel = document.getElementById('route-info-panel');
    const textDiv = document.getElementById('route-text');

    if (!panel || !textDiv) return;

    panel.style.display = 'block';

    // Generate Text Instructions
    let instructions = "";
    const path = route.path;
    if (path.length > 0) {
        instructions += `<div class="route-step">Start at <strong>${path[0].toUpperCase()}</strong></div>`;
        for (let i = 1; i < path.length - 1; i++) {
            instructions += `<div class="route-step">Go to <strong>${path[i].toUpperCase()}</strong></div>`;
        }
        instructions += `<div class="route-step">Arrive at Shelter: <strong>${path[path.length - 1].toUpperCase()}</strong></div>`;
    }
    textDiv.innerHTML = instructions;

    // Calculate ETAs
    // Assume distance unit is roughly 100m (0.1km)
    const distanceKm = route.distance / 10;

    // Speeds in km/h
    const speedWalk = 5;
    const speedBike = 15;
    const speedCar = 40; // Slower in city/disaster

    const timeWalk = Math.ceil((distanceKm / speedWalk) * 60);
    const timeBike = Math.ceil((distanceKm / speedBike) * 60);
    const timeCar = Math.ceil((distanceKm / speedCar) * 60);

    document.getElementById('eta-walk').textContent = `${timeWalk} min`;
    document.getElementById('eta-bike').textContent = `${timeBike} min`;
    document.getElementById('eta-car').textContent = `${timeCar} min`;

    // Force layout update
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Event Listener for Safest Route
document.getElementById('find-safest-route-btn').addEventListener('click', () => {
    const startId = document.getElementById('user-location').value;
    if (!startId) {
        logToConsole("⚠ PLEASE SELECT YOUR LOCATION");
        return;
    }
    findSafestRoute(startId);
});

// Auto-evacuation simulation
function simulateEvacuation() {
    if (!disasterActive) return;

    // Find all populated nodes
    const populated = nodes.filter(n => n.pop > 0 && !blockedNodes.has(n.id));
    const shelters = nodes.filter(n => n.shelter && !blockedNodes.has(n.id));

    if (shelters.length === 0) {
        logToConsole("❌ NO SAFE SHELTERS AVAILABLE");
        return;
    }

    let evacuating = 0;
    let saved = 0;

    populated.forEach(node => {
        if (node.pop <= 0) return;

        // Find nearest shelter with capacity
        let bestShelter = null;
        let bestRoute = null;

        shelters.forEach(shelter => {
            if (shelter.occ >= shelter.cap) return; // Full

            const route = dijkstra(node.id, shelter.id, true);
            if (route && (!bestRoute || route.distance < bestRoute.distance)) {
                bestRoute = route;
                bestShelter = shelter;
            }
        });

        if (bestShelter && bestRoute) {
            // Evacuate people
            const toEvac = Math.min(node.pop, bestShelter.cap - bestShelter.occ, 50);
            node.pop -= toEvac;
            bestShelter.occ += toEvac;
            saved += toEvac;
            evacuating++;

            // SPAWN PARTICLES (Visual Crowd)
            // Route path is [start, next, ..., end]
            // We want to move from current node to the next step in the route
            if (bestRoute.path.length > 1) {
                // Spawn 1 particle per 10 people to avoid clutter
                const particleCount = Math.ceil(toEvac / 10);
                spawnParticles(node.id, bestRoute.path[1], particleCount);
            }
        }
    });

    stats.evacuated = saved;
    stats.inTransit = populated.reduce((sum, n) => sum + n.pop, 0);

    // Casualties from blocked zones
    blockedNodes.forEach(id => {
        const node = nodes.find(n => n.id === id);
        if (node && node.pop > 0) {
            stats.casualties += Math.min(node.pop, 10);
            node.pop = Math.max(0, node.pop - 10);
        }
    });
}

// Click epicenter
canvas.addEventListener('click', (e) => {
    if (disasterActive && !isDragging && !disasterEpicenter) {
        nodes.forEach(node => {
            const nx = node.x * GRID_SCALE + offsetX, ny = node.y * GRID_SCALE + offsetY;
            if (Math.sqrt((e.clientX - nx) ** 2 + (e.clientY - ny) ** 2) < NODE_RADIUS + 10) {
                disasterEpicenter = node.id;
                blockedNodes.add(node.id);
                logToConsole(`🔥 EPICENTER: ${node.id.toUpperCase()}`);
                flashScreen();
                sounds.siren(); // Siren sound
                sounds.startAmbient(); // Start ambient alarm
                startSpread();
            }
        });
    }
});

function startSpread() {
    if (spreadInterval) clearInterval(spreadInterval);
    spreadInterval = setInterval(() => {
        // Spread disaster
        const newBlocked = new Set();
        blockedNodes.forEach(id => {
            const node = nodes.find(n => n.id === id);
            if (!node) return;

            edges.filter(e => e.from === id || e.to === id).forEach(edge => {
                const neighborId = edge.from === id ? edge.to : edge.from;
                if (Math.random() < 0.35) newBlocked.add(neighborId);
            });
        });

        newBlocked.forEach(id => {
            if (!blockedNodes.has(id)) {
                blockedNodes.add(id);
                logToConsole(`🔴 ${id.toUpperCase()} affected`);
                flashScreen();
                sounds.alert(); // Sound effect
            }
        });

        updateRisk(); // Update risk scores dynamically
        simulateEvacuation();
    }, 5000); // Slowed down from 3000ms to 5000ms
}

// UI Controls
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = zoomLevel * delta;
    if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
        const mouseX = e.clientX, mouseY = e.clientY;
        offsetX = mouseX - (mouseX - offsetX) * delta;
        offsetY = mouseY - (mouseY - offsetY) * delta;
        zoomLevel = newZoom;
        GRID_SCALE = 1.8 * zoomLevel;
    }
});

canvas.addEventListener('mousedown', (e) => {
    isDragging = true; dragStartX = e.clientX; dragStartY = e.clientY;
    dragOffsetX = offsetX; dragOffsetY = offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX = dragOffsetX + (e.clientX - dragStartX);
        offsetY = dragOffsetY + (e.clientY - dragStartY);
    } else {
        hoveredNode = null;
        nodes.forEach(node => {
            const nx = node.x * GRID_SCALE + offsetX, ny = node.y * GRID_SCALE + offsetY;
            if (Math.sqrt((e.clientX - nx) ** 2 + (e.clientY - ny) ** 2) < NODE_RADIUS + 5) hoveredNode = node;
        });
    }
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => { isDragging = false; hoveredNode = null; });

function draw() {
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = offsetX % 50; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY % 50; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw edges
    edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from);
        const to = nodes.find(n => n.id === edge.to);
        if (!from || !to) return;

        const fx = from.x * GRID_SCALE + offsetX, fy = from.y * GRID_SCALE + offsetY;
        const tx = to.x * GRID_SCALE + offsetX, ty = to.y * GRID_SCALE + offsetY;

        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Draw Particles (Crowd)
    particles.forEach((p, index) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
            particles.splice(index, 1);
            return;
        }

        const from = nodes.find(n => n.id === p.from);
        const to = nodes.find(n => n.id === p.to);
        if (!from || !to) return;

        const fx = from.x * GRID_SCALE + offsetX;
        const fy = from.y * GRID_SCALE + offsetY;
        const tx = to.x * GRID_SCALE + offsetX;
        const ty = to.y * GRID_SCALE + offsetY;

        const x = fx + (tx - fx) * p.progress;
        const y = fy + (ty - fy) * p.progress;

        // Draw particle
        ctx.fillStyle = '#0fff00';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0fff00';
        ctx.fillRect(x + p.offset, y + p.offset, 2, 2);
        ctx.shadowBlur = 0;
    });

    // Draw  routes
    currentRoutes.forEach((route, idx) => {
        for (let i = 0; i < route.path.length - 1; i++) {
            const from = nodes.find(n => n.id === route.path[i]);
            const to = nodes.find(n => n.id === route.path[i + 1]);
            if (!from || !to) continue;

            const fx = from.x * GRID_SCALE + offsetX, fy = from.y * GRID_SCALE + offsetY;
            const tx = to.x * GRID_SCALE + offsetX, ty = to.y * GRID_SCALE + offsetY;

            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
            ctx.strokeStyle = route.color;
            ctx.lineWidth = 4 - idx;
            ctx.shadowBlur = 15;
            ctx.shadowColor = route.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }


    });

    // Draw nodes
    nodes.forEach(node => {
        const nx = node.x * GRID_SCALE + offsetX, ny = node.y * GRID_SCALE + offsetY;
        ctx.beginPath(); ctx.arc(nx, ny, NODE_RADIUS, 0, Math.PI * 2);

        const isBlocked = blockedNodes.has(node.id);

        if (isBlocked) {
            ctx.fillStyle = '#ff0033';
            ctx.shadowBlur = 25;
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
        } else if (node.shelter) {
            const ratio = node.occ / node.cap;
            ctx.fillStyle = ratio > 0.9 ? '#ff8800' : ratio > 0.7 ? '#ffff00' : '#0fff00';
            ctx.shadowBlur = 20;
            ctx.globalAlpha = 1;
        } else if (node.pop > 500) {
            ctx.fillStyle = '#ff00ff'; // High population
            ctx.shadowBlur = 12;
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.globalAlpha = 1;
        }

        ctx.shadowColor = ctx.fillStyle; ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        if (isBlocked) {
            ctx.beginPath(); ctx.arc(nx, ny, 20, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff0033'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.stroke(); ctx.setLineDash([]);
        }

        // Draw Label (City Name)
        ctx.font = '10px Inter';
        ctx.fillStyle = '#2c3e50'; // Dark text for visibility on light map
        ctx.textAlign = 'center';
        // Offset Y to put text below node
        ctx.fillText(node.id.toUpperCase().replace(/_/g, ' '), nx, ny + 14);
    });

    // Hover tooltip
    if (hoveredNode) {
        const nx = hoveredNode.x * GRID_SCALE + offsetX, ny = hoveredNode.y * GRID_SCALE + offsetY;
        const info = hoveredNode.shelter
            ? `${hoveredNode.id.toUpperCase()} [SHELTER ${hoveredNode.occ}/${hoveredNode.cap}]`
            : `${hoveredNode.id.toUpperCase()} [POP: ${hoveredNode.pop}]`;

        ctx.font = '12px Orbitron';
        const tw = ctx.measureText(info).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(nx - tw / 2 - 8, ny - 30, tw + 16, 20);
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1;
        ctx.strokeRect(nx - tw / 2 - 8, ny - 30, tw + 16, 20);
        ctx.fillStyle = '#00ffff'; ctx.textAlign = 'center';
        ctx.fillText(info, nx, ny - 16);
    }

    requestAnimationFrame(draw);
}

function flashScreen() {
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,51,0.2);pointer-events:none;z-index:9999';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 80);
}

function logToConsole(msg) {
    const log = document.getElementById('sys-log');
    const p = document.createElement('p');
    p.textContent = `> ${msg}`;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    if (log.children.length > 15) log.removeChild(log.firstChild);
}

function updateUI() {
    if (!disasterActive) return;

    document.getElementById('evacuated-count').textContent = stats.evacuated;
    document.getElementById('transit-count').textContent = stats.inTransit;
    document.getElementById('casualty-count').textContent = stats.casualties;

    const total = stats.evacuated + stats.casualties;
    const eff = total > 0 ? (stats.evacuated / total) * 100 : 0;
    document.getElementById('efficiency-bar').style.width = `${eff}%`;
    document.getElementById('efficiency-text').textContent = `${eff.toFixed(1)}%`;

    const shelters = nodes.filter(n => n.shelter);
    const shelterHTML = shelters.map(s => {
        const ratio = s.occ / s.cap;
        // Professional colors
        const color = ratio > 0.9 ? '#c0392b' : ratio > 0.7 ? '#f39c12' : '#27ae60';
        return `<div class="shelter-row"><span style="color:${color};font-weight:bold;">${s.id.toUpperCase()}</span> <span>${s.occ}/${s.cap}</span></div>`;
    }).join('');
    document.getElementById('shelter-status').innerHTML = shelterHTML;

    // Mission status
    const remaining = nodes.filter(n => !blockedNodes.has(n.id)).length;
    document.getElementById('mission-status').innerHTML = `
        <p>🎯 Disaster: ${disasterType.toUpperCase()}</p>
        <p>📍 Epicenter: ${disasterEpicenter || 'Not set'}</p>
        <p>🗺️ Safe: ${remaining}/${nodes.length} zones</p>
    `;

    // Recommendation
    if (eff < 60 && total > 50) {
        document.getElementById('recommendation-text').innerHTML = '<p>❌ LOW EFFICIENCY - Review routes to shelters</p>';
        document.getElementById('recommendations').style.display = 'block';
        if (Math.random() < 0.05) sounds.warning(); // Occasional warning sound
    } else if (eff > 85) {
        document.getElementById('recommendation-text').innerHTML = '<p>✓ EXCELLENT - Strategy working!</p>';
        document.getElementById('recommendations').style.display = 'block';
        // Success sound on reaching 85% for first time
        if (eff >= 85 && eff < 86 && Math.random() < 0.3) sounds.success();
    }

    updateRadar();
}

function updateRadar() {
    const container = document.querySelector('.radar-container');
    if (!container) return;

    // Add a blip for the epicenter if active
    if (disasterActive && disasterEpicenter) {
        createBlip(container, 'danger');
    }

    // Random blips for "activity" (evacuees, IoT signals)
    if (Math.random() < 0.4) {
        createBlip(container, 'safe');
    }
}

function createBlip(container, type) {
    const blip = document.createElement('div');
    blip.className = `radar-blip ${type}`;

    // Random position within circle
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 40; // Keep inside
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    blip.style.left = `${x}%`;
    blip.style.top = `${y}%`;

    container.appendChild(blip);

    // Remove after animation
    setTimeout(() => {
        blip.remove();
    }, 2000);
}

// Disaster trigger
document.getElementById('trigger-disaster-btn').addEventListener('click', () => {
    sounds.blip(); // UI sound
    disasterType = document.getElementById('disaster-type').value;
    if (disasterType === 'none') {
        disasterActive = false;
        blockedNodes.clear();
        disasterEpicenter = null;
        if (timerInterval) clearInterval(timerInterval);
        if (spreadInterval) clearInterval(spreadInterval);
        document.getElementById('disaster-timer').style.display = 'none';
        logToConsole("✓ Simulation stopped");
        sounds.stopAmbient(); // Stop ambient alarm
        loadNodes();
        return;
    }

    disasterActive = true;
    disasterEpicenter = null;
    blockedNodes.clear();
    currentRoutes = [];
    stats = { totalEvacuees: 500, evacuated: 0, inTransit: 0, casualties: 0, routesCalculated: 0 };
    evacuationTimeLeft = 600;

    loadNodes();

    logToConsole(`🚨 ${disasterType.toUpperCase()} DISASTER ACTIVE`);
    logToConsole(">> CLICK NODE TO SET EPICENTER");
    flashScreen();

    document.getElementById('disaster-timer').style.display = 'block';

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        evacuationTimeLeft--;
        const mins = Math.floor(evacuationTimeLeft / 60);
        const secs = evacuationTimeLeft % 60;
        document.getElementById('disaster-timer').textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;

        updateUI();

        if (evacuationTimeLeft <= 0) {
            clearInterval(timerInterval);
            if (spreadInterval) clearInterval(spreadInterval);
            document.getElementById('disaster-timer').textContent = "⚠ COMPLETE";
            const finalEff = ((stats.evacuated / (stats.evacuated + stats.casualties || 1)) * 100).toFixed(1);
            logToConsole(`FINAL: ${stats.evacuated} saved | ${stats.casualties} casualties | ${finalEff}% efficiency`);
            sounds.stopAmbient(); // Stop ambient on completion

            // Final sound based on efficiency
            if (finalEff >= 90) {
                sounds.success(); sounds.success(); // Double success!
            } else if (finalEff < 60) {
                sounds.warning();
            }
        }
    }, 1000);
});

loadNodes();
logToConsole("🎯 GOAL: Achieve 90%+ evacuation efficiency");
logToConsole(`✓ ${nodes.length} nodes loaded`);
logToConsole("Select disaster type & TRIGGER");
draw();

// Sound toggle
document.getElementById('sound-toggle').addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    sounds.blip();
    logToConsole(soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF");
    if (!soundEnabled) sounds.stopAmbient();
});

setInterval(updateUI, 1000);
