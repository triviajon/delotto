import { initializeServer } from './utils/server_tools';

// Initialize the server
const { server: server, wss: wss, entries: entries } = initializeServer();

// Setup WebSocket connection handling
wss.on('connection', function(ws) {
  console.log('Client connected');

  // Send initial entries data to the client upon connection
  ws.send(JSON.stringify(entries));

  ws.on('close', function() {
    console.log('Client disconnected');
  });
});