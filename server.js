const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 8080;

// HTTP Server đơn giản cho Render kiểm tra trạng thái hoạt động (Health Check)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('WebRTC Doorbell Signaling Server is LIVE & READY!\n');
});

const wss = new WebSocket.Server({ server: server });
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message, isBinary) => {
        // 1. Nếu là dữ liệu nhị phân (Frame ảnh JPEG từ ESP32) -> Chuyển tiếp ngay, KHÔNG JSON.parse
        if (isBinary || Buffer.isBuffer(message)) {
            if (currentRoom && rooms[currentRoom]) {
                rooms[currentRoom].forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message, { binary: true });
                    }
                });
            }
            return;
        }

        // 2. Chỉ parse JSON khi là chuỗi Text (Lệnh: join, RING, ACCEPT_CALL, OPEN_DOOR, v.v.)
        try {
            const textMsg = message.toString();
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
            console.error('[WARN] Tin nhắn text không hợp lệ:', e.message);
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
