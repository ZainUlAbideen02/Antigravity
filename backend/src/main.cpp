#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include "../include/server.h"
#include "../include/simulation.h"
#include "../include/graph.h"

int main() {
    std::cout << "Starting Intelligent Disaster-Evacuation Routing System Backend..." << std::endl;

    // Initialize Graph
    Graph cityMap;
    cityMap.loadMockData(); // Load some dummy nodes and edges for testing

    // Initialize Simulation Engine
    SimulationEngine simEngine(&cityMap);

    // Start Simulation Thread
    std::thread simThread([&simEngine]() {
        simEngine.run();
    });

    // Initialize and Start HTTP Server
    APIServer server(8080, &cityMap);
    server.start();

    // Join threads (in a real app, we'd have a clean shutdown signal)
    if (simThread.joinable()) {
        simThread.join();
    }

    return 0;
}
