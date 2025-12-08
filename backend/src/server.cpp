#include "../include/server.h"
#include "../include/router.h"
#include <iostream>
#include <sstream>
#include <thread>

APIServer::APIServer(int p, Graph* g) : port(p), graph(g), serverSocket(INVALID_SOCKET) {}

void APIServer::start() {
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed." << std::endl;
        return;
    }

    struct addrinfo *result = NULL, *ptr = NULL, hints;

    ZeroMemory(&hints, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_protocol = IPPROTO_TCP;
    hints.ai_flags = AI_PASSIVE;

    if (getaddrinfo(NULL, std::to_string(port).c_str(), &hints, &result) != 0) {
        std::cerr << "getaddrinfo failed." << std::endl;
        WSACleanup();
        return;
    }

    serverSocket = socket(result->ai_family, result->ai_socktype, result->ai_protocol);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Error at socket(): " << WSAGetLastError() << std::endl;
        freeaddrinfo(result);
        WSACleanup();
        return;
    }

    if (bind(serverSocket, result->ai_addr, (int)result->ai_addrlen) == SOCKET_ERROR) {
        std::cerr << "bind failed with error: " << WSAGetLastError() << std::endl;
        freeaddrinfo(result);
        closesocket(serverSocket);
        WSACleanup();
        return;
    }

    freeaddrinfo(result);

    if (listen(serverSocket, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "listen failed with error: " << WSAGetLastError() << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return;
    }

    std::cout << "Server listening on port " << port << std::endl;

    while (true) {
        SOCKET clientSocket = accept(serverSocket, NULL, NULL);
        if (clientSocket == INVALID_SOCKET) {
            std::cerr << "accept failed: " << WSAGetLastError() << std::endl;
            closesocket(serverSocket);
            WSACleanup();
            return;
        }
        
        // In a real server, we'd use a thread pool. For now, simple thread per request or blocking.
        // Let's use a thread to avoid blocking the main loop
        std::thread clientThread(&APIServer::handleClient, this, clientSocket);
        clientThread.detach();
    }
}

void APIServer::handleClient(SOCKET clientSocket) {
    const int recvbuflen = 4096;
    char recvbuf[recvbuflen];
    int iResult = recv(clientSocket, recvbuf, recvbuflen, 0);

    if (iResult > 0) {
        std::string request(recvbuf, iResult);
        std::string response = processRequest(request);
        send(clientSocket, response.c_str(), (int)response.length(), 0);
    }

    closesocket(clientSocket);
}

std::string APIServer::processRequest(const std::string& request) {
    // Simple manual HTTP parsing
    std::istringstream iss(request);
    std::string method, path, protocol;
    iss >> method >> path >> protocol;

    std::cout << "Request: " << method << " " << path << std::endl;

    // CORS headers
    std::string corsHeaders = 
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n";

    if (method == "OPTIONS") {
        return "HTTP/1.1 204 No Content\r\n" + corsHeaders + "\r\n";
    }

    if (path == "/api/map" && method == "GET") {
        // Return graph data
        std::string json = "{ \"nodes\": [";
        bool first = true;
        for (auto const& [id, node] : graph->nodes) {
            if (!first) json += ",";
            json += "{ \"id\": \"" + node.id + "\", \"x\": " + std::to_string(node.x) + 
                    ", \"y\": " + std::to_string(node.y) + 
                    ", \"risk\": " + std::to_string(node.riskScore) + 
                    ", \"isShelter\": " + (node.isShelter ? "true" : "false") + 
                    ", \"neighbors\": [";
            bool firstEdge = true;
            for (const auto& edge : node.neighbors) {
                if (!firstEdge) json += ",";
                json += "{ \"to\": \"" + edge.toNodeId + "\", \"weight\": " + std::to_string(edge.getWeight()) + "}";
                firstEdge = false;
            }
            json += "] }";
            first = false;
        }
        json += "] }";
        return generateResponse(json);
    }
    else if (path == "/api/route" && method == "POST") {
        // Parse body for start/end (very naive parsing)
        size_t bodyPos = request.find("\r\n\r\n");
        if (bodyPos != std::string::npos) {
            std::string body = request.substr(bodyPos + 4);
            // Expected format: {"start": "n_0_0", "end": "n_4_4"}
            // Naive extraction
            size_t startPos = body.find("\"start\":");
            size_t endPos = body.find("\"end\":");
            if (startPos != std::string::npos && endPos != std::string::npos) {
                // Extract values (assuming no spaces for simplicity, or just simple parsing)
                // Let's just hardcode a route for now or implement Dijkstra
                // Actually, let's call the Router
                Router router(graph);
                // Extract IDs roughly
                std::string startId = "n_0_0"; // Default
                std::string endId = "n_4_4";   // Default
                
                // Better parsing logic needed here for real app, but for prototype:
                // Find value between quotes after key
                auto extractValue = [&](std::string key) {
                    size_t keyPos = body.find(key);
                    if (keyPos == std::string::npos) return std::string("");
                    size_t firstQuote = body.find("\"", keyPos + key.length() + 1); // skip key and colon
                    size_t secondQuote = body.find("\"", firstQuote + 1);
                    return body.substr(firstQuote + 1, secondQuote - firstQuote - 1);
                };

                startId = extractValue("start");
                endId = extractValue("end");

                std::vector<std::string> path = router.findShortestPath(startId, endId);
                
                std::string json = "{ \"path\": [";
                for (size_t i = 0; i < path.size(); ++i) {
                    if (i > 0) json += ",";
                    json += "\"" + path[i] + "\"";
                }
                json += "] }";
                return generateResponse(json);
            }
        }
    }

    return "HTTP/1.1 404 Not Found\r\n" + corsHeaders + "\r\n";
}

std::string APIServer::generateResponse(const std::string& content, const std::string& contentType) {
    std::string corsHeaders = 
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n";

    return "HTTP/1.1 200 OK\r\n" + corsHeaders + 
           "Content-Type: " + contentType + "\r\n" + 
           "Content-Length: " + std::to_string(content.length()) + "\r\n\r\n" + 
           content;
}
