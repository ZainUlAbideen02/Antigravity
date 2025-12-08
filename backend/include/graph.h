#ifndef GRAPH_H
#define GRAPH_H

#include <vector>
#include <string>
#include <unordered_map>
#include <cmath>
#include <iostream>

struct Node {
    std::string id;
    double x, y;
    bool isShelter;
    double risk;
    std::vector<std::string> neighbors;
    
    Node() : x(0), y(0), isShelter(false), risk(0.0) {}
    Node(std::string _id, double _x, double _y, bool _shelter = false) 
        : id(_id), x(_x), y(_y), isShelter(_shelter), risk(0.0) {}
};

class Graph {
public:
    std::unordered_map<std::string, Node> nodes;

    void addNode(const std::string& id, double x, double y, bool isShelter = false) {
        nodes[id] = Node(id, x, y, isShelter);
    }

    void addEdge(const std::string& from, const std::string& to) {
        if (nodes.find(from) != nodes.end()) {
            nodes[from].neighbors.push_back(to);
            nodes[to].neighbors.push_back(from);
        }
    }

    void loadMockData() {
        // 40 Islamabad locations
        addNode("faisal_mosque", 180, 40, true);
        addNode("daman_e_koh", 250, 75, false);
        addNode("pir_sohawa", 310, 55, false);
        addNode("rawal_lake", 90, 95, true);
        addNode("saidpur", 145, 85, false);
        addNode("lok_virsa", 130, 125, false);
        addNode("quaid_e_azam_uni", 95, 145, false);
        addNode("pakistan_monument", 155, 135, true);
        addNode("nust", 125, 185, false);
        addNode("blue_area", 185, 155, false);
        addNode("aabpara", 165, 175, false);
        addNode("melody", 185, 185, false);
        addNode("jinnah_super", 210, 195, false);
        addNode("f6_markaz", 240, 175, false);
        addNode("f7_markaz", 285, 195, false);
        addNode("f8_markaz", 325, 210, false);
        addNode("centaurus", 250, 215, false);
        addNode("zero_point", 295, 145, false);
        addNode("faizabad", 340, 170, false);
        addNode("shakarparian", 385, 185, true);
        addNode("pims_hospital", 195, 235, false);
        addNode("g6", 185, 225, false);
        addNode("g7", 230, 245, false);
        addNode("g8", 270, 265, false);
        addNode("kachnar_park", 165, 255, false);
        addNode("h8", 155, 245, false);
        addNode("h9", 195, 265, false);
        addNode("rose_garden", 210, 260, false);
        addNode("i8", 135, 275, false);
        addNode("i9", 175, 295, false);
        addNode("pwd", 235, 285, false);
        addNode("pwd_housing", 215, 305, false);
        addNode("g9", 305, 285, false);
        addNode("f9_park", 330, 245, true);
        addNode("g10", 345, 305, false);
        addNode("g11", 385, 325, false);
        addNode("dha_phase1", 305, 355, false);
        addNode("dha_phase2", 350, 375, false);
        addNode("bahria_town", 430, 375, false);
        addNode("rawat", 480, 345, false);
        
        // Dense connections
        addEdge("faisal_mosque", "daman_e_koh");
        addEdge("faisal_mosque", "saidpur");
        addEdge("daman_e_koh", "pir_sohawa");
        addEdge("daman_e_koh", "zero_point");
        addEdge("rawal_lake", "saidpur");
        addEdge("rawal_lake", "quaid_e_azam_uni");
        addEdge("saidpur", "lok_virsa");
        addEdge("lok_virsa", "pakistan_monument");
        addEdge("qu aid_e_azam_uni", "pakistan_monument");
        addEdge("quaid_e_azam_uni", "nust");
        addEdge("pakistan_monument", "blue_area");
        addEdge("nust", "aabpara");
        addEdge("blue_area", "aabpara");
        addEdge("blue_area", "f6_markaz");
        addEdge("aabpara", "melody");
        addEdge("aabpara", "jinnah_super");
        addEdge("melody", "jinnah_super");
        addEdge("melody", "g6");
        addEdge("jinnah_super", "f6_markaz");
        addEdge("jinnah_super", "centaurus");
        addEdge("f6_markaz", "f7_markaz");
        addEdge("f7_markaz", "f8_markaz");
        addEdge("f7_markaz", "centaurus");
        addEdge("f7_markaz", "zero_point");
        addEdge("f8_markaz", "f9_park");
        addEdge("centaurus", "g6");
        addEdge("centaurus", "g7");
        addEdge("zero_point", "faizabad");
        addEdge("faizabad", "shakarparian");
        addEdge("shakarparian", "f9_park");
        addEdge("pims_hospital", "g6");
        addEdge("pims_hospital", "g7");
        addEdge("g6", "g7");
        addEdge("g6", "h9");
        addEdge("g7", "g8");
        addEdge("g7", "kachnar_park");
        addEdge("g8", "pwd");
        addEdge("g8", "g9");
        addEdge("kachnar_park", "h8");
        addEdge("kachnar_park", "rose_garden");
        addEdge("h8", "i8");
        addEdge("h8", "h9");
        addEdge("h9", "i9");
        addEdge("h9", "rose_garden");
        addEdge("rose_garden", "pwd");
        addEdge("i8", "i9");
        addEdge("i9", "pwd_housing");
        addEdge("pwd", "pwd_housing");
        addEdge("pwd", "g9");
        addEdge("g9", "f9_park");
        addEdge("g9", "g10");
        addEdge("f9_park", "g10");
        addEdge("g10", "g11");
        addEdge("g10", "dha_phase1");
        addEdge("g11", "dha_phase1");
        addEdge("g11", "dha_phase2");
        addEdge("dha_phase1", "dha_phase2");
        addEdge("dha_phase1", "pwd_housing");
        addEdge("dha_phase2", "bahria_town");
        addEdge("dha_phase2", "rawat");
        addEdge("bahria_town", "rawat");
        
        std::cout << "Islamabad Map: " << nodes.size() << " nodes loaded!" << std::endl;
    }
};

#endif
