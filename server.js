const http = require('http');
const WebSocket = require('ws');

// Render.com cap cong dong qua process.env.PORT, mac dinh 8080
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WebRTC Doorbell Signaling Server is LIVE & READY!\n');
});

const wss = new WebSocket.Server({ server: server });
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                currentRoom = data.room;
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = new Set();
                }
                rooms[currentRoom].add(ws);
                console.log('[JOIN] Thiet bi da vao phong: ' + currentRoom + ' (Tong client: ' + rooms[currentRoom].size + ')');
                return;
            }
            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(typeof message === 'string' ? message : message.toString());
                    }
                });
            }
        } catch (e) {
            if (Buffer.isBuffer(message) && currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            console.log('[LEAVE] Thiet bi ngat ket noi khoi phong: ' + currentRoom);
            if (rooms[currentRoom].size === 0) {
                delete rooms[currentRoom];
            }
        }
    });

    ws.on('error', (err) => {
        console.error('[ERROR] Loi ket noi WebSocket:', err.message);
    });
});

server.listen(port, () => {
    console.log('=======================================================');
    console.log(' Signaling Server dang hoat dong tai cong: ' + port);
    console.log(' San sang phuc vu ket noi WebRTC Doorbell!');
    console.log('=======================================================');
});
