import { Server } from 'socket.io';

export function setupWatchPartyServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[watch-party] User connected: ${socket.id}`);

    // Join a specific room
    socket.on('join-room', (roomId, callback) => {
      socket.join(roomId);
      console.log(`[watch-party] ${socket.id} joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', { id: socket.id });
      
      if (typeof callback === 'function') {
        const clients = io.sockets.adapter.rooms.get(roomId);
        callback({ status: 'ok', numUsers: clients ? clients.size : 1 });
      }
    });

    // Handle sync events
    socket.on('sync-event', (data) => {
      // data: { roomId, type: 'play'|'pause'|'seek', currentTime }
      const { roomId, type, currentTime } = data;
      if (!roomId) return;
      
      // Broadcast to everyone ELSE in the room
      socket.to(roomId).emit('sync-command', {
        type,
        currentTime,
        senderId: socket.id
      });
    });

    // Handle chat
    socket.on('send-message', (data) => {
      const { roomId, username, text } = data;
      if (!roomId) return;
      
      io.to(roomId).emit('new-message', {
        id: Date.now().toString(),
        senderId: socket.id,
        username,
        text,
        timestamp: Date.now()
      });
    });

    socket.on('disconnect', () => {
      console.log(`[watch-party] User disconnected: ${socket.id}`);
    });
  });

  return io;
}
