#ifndef SIMULATION_H
#define SIMULATION_H

#include "graph.h"
#include <thread>
#include <chrono>
#include <random>

class SimulationEngine {
private:
    Graph* graph;
    bool running;

public:
    SimulationEngine(Graph* g) : graph(g), running(true) {}

    void run() {
        std::cout << "Simulation Engine Started." << std::endl;
        std::default_random_engine generator;
        std::uniform_int_distribution<int> distribution(0, 4);
        std::uniform_real_distribution<double> riskDist(0.0, 1.0);

        while (running) {
            // Simulate dynamic changes every 2 seconds
            std::this_thread::sleep_for(std::chrono::seconds(2));

            // Randomly increase risk in a zone
            int x = distribution(generator);
            int y = distribution(generator);
            std::string nodeId = "n_" + std::to_string(x) + "_" + std::to_string(y);
            
            if (graph->nodes.find(nodeId) != graph->nodes.end()) {
                graph->nodes[nodeId].riskScore = riskDist(generator);
                // std::cout << "Sim: Updated risk for " << nodeId << " to " << graph->nodes[nodeId].riskScore << std::endl;
            }
        }
    }

    void stop() {
        running = false;
    }
};

#endif
