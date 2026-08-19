import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust this in production
      methods: ["GET", "POST"]
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;
    
    // 1. Join Branch Room (For Kitchen Station to receive KOTs)
    if (user.activeBranchId || user.branchId) {
      const branchId = user.activeBranchId || user.branchId;
      socket.join(`room_branch_${branchId}`);
      console.log(`User ${user.userId || user.id} joined room_branch_${branchId}`);
    }

    // 2. Join Personal User Room (For Waiter to receive item ready alerts)
    if (user.userId || user.id) {
      const userId = user.userId || user.id;
      socket.join(`room_user_${userId}`);
      console.log(`User ${userId} joined room_user_${userId}`);
    }

    socket.on("disconnect", () => {
      console.log(`User ${user.userId || user.id} disconnected`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
