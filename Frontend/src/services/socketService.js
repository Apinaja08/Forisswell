import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

/**
 * Initialize Socket.io connection with JWT token
 * @param {string} token - JWT authentication token
 * @returns {Object} Socket instance
 */
export const initializeSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  return socket;
};

/**
 * Get current socket instance
 * @returns {Object|null} Socket instance or null if not connected
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Listen for new alerts from server
 * @param {Function} callback - Function to call when new alert arrives
 * @returns {Function} Unsubscribe function
 */
export const onNewAlert = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on('new-alert', callback);

  // Return cleanup function
  return () => {
    socket.off('new-alert', callback);
  };
};

/**
 * Listen for alert accepted event (another volunteer took it)
 * @param {Function} callback - Function to call when alert is accepted
 * @returns {Function} Unsubscribe function
 */
export const onAlertAccepted = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on('alert-accepted', callback);

  return () => {
    socket.off('alert-accepted', callback);
  };
};

/**
 * Listen for alert completed event
 * @param {Function} callback - Function to call when alert is completed
 * @returns {Function} Unsubscribe function
 */
export const onAlertCompleted = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on('alert-completed', callback);

  return () => {
    socket.off('alert-completed', callback);
  };
};

/**
 * Listen for alert expired event
 * @param {Function} callback - Function to call when alert expires
 * @returns {Function} Unsubscribe function
 */
export const onAlertExpired = (callback) => {
  if (!socket) {
    console.warn('Socket not initialized');
    return () => {};
  }

  socket.on('alert-expired', callback);

  return () => {
    socket.off('alert-expired', callback);
  };
};

/**
 * Join specific alert room for real-time updates
 * @param {string} alertId - Alert ID
 */
export const joinAlert = (alertId) => {
  if (socket?.connected) {
    socket.emit('join-alert', alertId);
  }
};

/**
 * Leave specific alert room
 * @param {string} alertId - Alert ID
 */
export const leaveAlert = (alertId) => {
  if (socket?.connected) {
    socket.emit('leave-alert', alertId);
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  onNewAlert,
  onAlertAccepted,
  onAlertCompleted,
  onAlertExpired,
  joinAlert,
  leaveAlert,
};
