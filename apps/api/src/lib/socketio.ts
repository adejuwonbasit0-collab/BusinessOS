import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

export function setupSocketIO(io: SocketIOServer) {
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.slice(7);
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.userId = payload.sub;
      socket.data.tenantId = payload.tenantId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, tenantId } = socket.data;
    logger.info(`WS connected: user=${userId} tenant=${tenantId}`);
    socket.join(`tenant:${tenantId}`);
    socket.join(`user:${userId}`);

    socket.on('join:workflow', (workflowId: string) => socket.join(`workflow:${workflowId}`));
    socket.on('disconnect', () => logger.info(`WS disconnected: user=${userId}`));
  });

  return io;
}

export function emitToTenant(io: SocketIOServer, tenantId: string, event: string, data: any) {
  io.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}
