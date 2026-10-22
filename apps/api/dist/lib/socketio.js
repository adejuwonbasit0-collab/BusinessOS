"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = setupSocketIO;
exports.emitToTenant = emitToTenant;
exports.emitToUser = emitToUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./logger");
function setupSocketIO(io) {
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.slice(7);
        if (!token)
            return next(new Error('Authentication required'));
        try {
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.data.userId = payload.sub;
            socket.data.tenantId = payload.tenantId;
            socket.data.role = payload.role;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const { userId, tenantId } = socket.data;
        logger_1.logger.info(`WS connected: user=${userId} tenant=${tenantId}`);
        socket.join(`tenant:${tenantId}`);
        socket.join(`user:${userId}`);
        socket.on('join:workflow', (workflowId) => socket.join(`workflow:${workflowId}`));
        socket.on('disconnect', () => logger_1.logger.info(`WS disconnected: user=${userId}`));
    });
    return io;
}
function emitToTenant(io, tenantId, event, data) {
    io.to(`tenant:${tenantId}`).emit(event, data);
}
function emitToUser(io, userId, event, data) {
    io.to(`user:${userId}`).emit(event, data);
}
//# sourceMappingURL=socketio.js.map