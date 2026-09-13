const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WebRTC Doorbell Signaling Server ready\n');
});

const wss = new WebSocket.Server({ server: server });
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'join') {
                currentRoom = data.room;
                if (!rooms[currentRoom]) rooms[currentRoom] = new Set();
                rooms[currentRoom].add(ws);
                console.log(`[ROOM] Client join: ${currentRoom}`);
                return;
            }

            // Chuyen tiep cac ban tin dieu khien (RING, ACCEPT, SDP, ICE) sang thiet bi con lai
            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        } catch (e) {
            console.error('[ERR] Chi nhan JSON text signaling:', e.message);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            if (rooms[currentRoom].size === 0) delete rooms[currentRoom];
        }
    });

    ws.on('error', (err) => {
        console.error('[SOCKET ERROR]', err.message);
    });
});

server.listen(port, () => {
    console.log(`Signaling Server ready on port ${port}`);
});
