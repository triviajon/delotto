import { initializeServer } from "./utils/server_tools";

const { wss: wss, entries: entries } = initializeServer();

wss.on("connection", function(ws) {
    console.log("Client connected");

    // Send initial entries data to the client upon connection
    ws.send(JSON.stringify(entries));

    ws.on("close", function() {
        console.log("Client disconnected");
    });
});