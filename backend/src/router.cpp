#include "../include/router.h"
#include <queue>
#include <map>
#include <algorithm>
#include <limits>

Router::Router(Graph* g) : graph(g) {}

std::vector<std::string> Router::findShortestPath(const std::string& start, const std::string& end) {
    std::map<std::string, double> dist;
    std::map<std::string, std::string> prev;
    
    for (auto const& [id, node] : graph->nodes) {
        dist[id] = std::numeric_limits<double>::infinity();
    }
    dist[start] = 0.0;

    using P = std::pair<double, std::string>;
    std::priority_queue<P, std::vector<P>, std::greater<P>> pq;
    pq.push({0.0, start});

    while (!pq.empty()) {
        double d = pq.top().first;
        std::string u = pq.top().second;
        pq.pop();

        if (d > dist[u]) continue;
        if (u == end) break;

        if (graph->nodes.find(u) == graph->nodes.end()) continue;

        for (const auto& edge : graph->nodes[u].neighbors) {
            double weight = edge.getWeight();
            if (dist[u] + weight < dist[edge.toNodeId]) {
                dist[edge.toNodeId] = dist[u] + weight;
                prev[edge.toNodeId] = u;
                pq.push({dist[edge.toNodeId], edge.toNodeId});
            }
        }
    }

    std::vector<std::string> path;
    if (dist[end] == std::numeric_limits<double>::infinity()) {
        return path; // No path found
    }

    for (std::string at = end; at != ""; at = prev[at]) {
        path.push_back(at);
        if (at == start) break;
    }
    std::reverse(path.begin(), path.end());
    return path;
}
