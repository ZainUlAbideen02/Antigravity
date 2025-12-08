#ifndef SERVER_H
#define SERVER_H

#include "graph.h"
#include <winsock2.h>
#include <ws2tcpip.h>
#include <string>
#include <vector>

#pragma comment(lib, "Ws2_32.lib")

class APIServer {
private:
    int port;
    Graph* graph;
    SOCKET serverSocket;

    void handleClient(SOCKET clientSocket);
    std::string processRequest(const std::string& request);
    std::string generateResponse(const std::string& content, const std::string& contentType = "application/json");

public:
    APIServer(int p, Graph* g);
    void start();
};

#endif
