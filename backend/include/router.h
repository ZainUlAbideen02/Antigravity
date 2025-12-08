#ifndef ROUTER_H
#define ROUTER_H

#include "graph.h"
#include <vector>
#include <string>

class Router {
private:
    Graph* graph;

public:
    Router(Graph* g);
    std::vector<std::string> findShortestPath(const std::string& start, const std::string& end);
};

#endif
