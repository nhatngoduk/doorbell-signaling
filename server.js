const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WebRTC Doorbell Signaling Server is LIVE & READY!\n');
});

const wss = new WebSocket.Server({ server: server });
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message, isBinary) => {
        // 1. Chỉ khi isBinary === true mới là Frame ảnh JPEG -> Forward trực tiếp
        if (isBinary) {
            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message, { binary: true });
                    }
                });
            }
            return;
        }

        // 2. Khi isBinary === false: Xử lý lệnh Text (join, RING, ACCEPT_CALL, OPEN_DOOR)
        try {
            const textMsg = message.toString('utf-8');
            const data = JSON.parse(textMsg);

            if (data.type === 'join') {
                currentRoom = data.room;
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = new Set();
                }
                rooms[currentRoom].add(ws);
                console.log('[JOIN] Thiết bị vào phòng: ' + currentRoom + ' (Tổng client: ' + rooms[currentRoom].size + ')');
                return;
            }

            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(textMsg);
                    }
                });
            }
        } catch (e) {
            console.error('[WARN] Lỗi parse text:', e.message);
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].delete(ws);
            console.log('[LEAVE] Thiết bị rời phòng: ' + currentRoom);
            if (rooms[currentRoom].size === 0) {
                delete rooms[currentRoom];
            }
        }
    });

    ws.on('error', (err) => {
        console.error('[ERROR] Lỗi WebSocket:', err.message);
    });
});

server.listen(port, () => {
    console.log('=======================================================');
    console.log(' Signaling Server đang hoạt động tại cổng: ' + port);
    console.log(' Sẵn sàng phục vụ kết nối Doorbell!');
    console.log('=======================================================');
});
