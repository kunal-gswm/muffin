import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useWatchParty(roomId) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [partyMembers, setPartyMembers] = useState(0);
  const [messages, setMessages] = useState([]);
  
  // Callback refs to prevent stale closures
  const onSyncRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    // Connect to backend
    const newSocket = io('http://127.0.0.1:3939');
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-room', roomId, (response) => {
        setPartyMembers(response.numUsers);
      });
    });

    newSocket.on('user-joined', () => {
      setPartyMembers(prev => prev + 1);
    });

    newSocket.on('sync-command', (data) => {
      if (onSyncRef.current) {
        onSyncRef.current(data);
      }
    });

    newSocket.on('new-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const sendSync = (type, currentTime) => {
    if (socket && isConnected) {
      socket.emit('sync-event', { roomId, type, currentTime });
    }
  };

  const sendMessage = (username, text) => {
    if (socket && isConnected) {
      socket.emit('send-message', { roomId, username, text });
    }
  };

  const setOnSync = (callback) => {
    onSyncRef.current = callback;
  };

  return {
    isConnected,
    partyMembers,
    messages,
    sendSync,
    sendMessage,
    setOnSync
  };
}
