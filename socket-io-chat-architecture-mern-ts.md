# Socket.IO Chat Architecture for MERN TypeScript

This is a reusable chat and communication module designed to fit your current architecture: `config`, `app`, `middlewares`, `modules`, `services`, `models`, `controllers`, `routes`, and MERN TypeScript frontend code.

## Install Packages

Backend:

```bash
npm install socket.io
npm install -D @types/node
```

Frontend:

```bash
npm install socket.io-client
```

## Backend Folder Structure

```txt
src/
  app/
    App.ts
  config/
    config.ts
    socket.ts
  controllers/
    conversation.controller.ts
    message.controller.ts
  middlewares/
    authMiddleware.ts
    socketAuthMiddleware.ts
  models/
    Conversation.ts
    Message.ts
  routes/
    conversation.routes.ts
    message.routes.ts
    routes.ts
  services/
    chat.service.ts
    socket.service.ts
    token.service.ts
  sockets/
    chat.socket.ts
    index.ts
  types/
    chat.types.ts
    socket.types.ts
```

## Backend Config Update

`src/config/config.ts`

```ts
import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongo_uri: string;
  frontend_uri: string;
  socket: {
    corsOrigin: string[];
  };
  tokens: {
    jwt_secret: string;
    jwt_refresh_secret: string;
    admin_jwt_secret: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongo_uri: process.env.MONGO_URI!,
  frontend_uri: process.env.FRONTEND_URI || "http://localhost:5173",
  socket: {
    corsOrigin: (process.env.SOCKET_CORS_ORIGIN || process.env.FRONTEND_URI || "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim()),
  },
  tokens: {
    jwt_secret: process.env.JWT_SECRET || "",
    jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || "",
    admin_jwt_secret: process.env.ADMIN_JWT_SECRET || "",
  },
};

export default config;
```

## Backend Types

`src/types/chat.types.ts`

```ts
import { Types } from "mongoose";

export enum ConversationType {
  direct = "direct",
  group = "group",
}

export enum MessageType {
  text = "text",
  image = "image",
  file = "file",
  system = "system",
}

export enum MessageStatus {
  sent = "sent",
  delivered = "delivered",
  read = "read",
}

export interface IConversationParticipant {
  user: Types.ObjectId;
  joinedAt: Date;
  lastReadMessage?: Types.ObjectId;
  isMuted: boolean;
}

export interface ISendMessagePayload {
  conversationId: string;
  body: string;
  type?: MessageType;
  attachments?: string[];
}

export interface ITypingPayload {
  conversationId: string;
  isTyping: boolean;
}
```

`src/types/socket.types.ts`

```ts
import { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    [key: string]: any;
  };
}

export const SocketEvents = {
  connection: "connection",
  disconnect: "disconnect",

  conversationJoin: "conversation:join",
  conversationLeave: "conversation:leave",

  messageSend: "message:send",
  messageNew: "message:new",
  messageRead: "message:read",

  typing: "typing",
  onlineUsers: "users:online",
  error: "socket:error",
} as const;
```

## Backend Models

`src/models/Conversation.ts`

```ts
import { ConversationType, IConversationParticipant } from "@/types/chat.types";
import { model, Schema, Types, Document } from "mongoose";

export interface IConversation extends Document {
  title?: string;
  type: ConversationType;
  participants: IConversationParticipant[];
  createdBy: Types.ObjectId;
  lastMessage?: Types.ObjectId;
}

const participantSchema = new Schema<IConversationParticipant>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    title: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: Object.values(ConversationType),
      default: ConversationType.direct,
      required: true,
    },
    participants: {
      type: [participantSchema],
      validate: {
        validator: (participants: IConversationParticipant[]) => participants.length >= 2,
        message: "Conversation requires at least two participants",
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: false,
    },
  },
  {
    collection: "conversations",
    timestamps: true,
  }
);

conversationSchema.index({ "participants.user": 1 });
conversationSchema.index({ updatedAt: -1 });

export default model<IConversation>("Conversation", conversationSchema);
```

`src/models/Message.ts`

```ts
import { MessageStatus, MessageType } from "@/types/chat.types";
import { model, Schema, Types, Document } from "mongoose";

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  body: string;
  type: MessageType;
  attachments: string[];
  status: MessageStatus;
  readBy: Types.ObjectId[];
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.text,
    },
    attachments: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.sent,
    },
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  {
    collection: "messages",
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default model<IMessage>("Message", messageSchema);
```

## Backend Socket Config

`src/config/socket.ts`

```ts
import config from "@/config/config";
import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

let io: SocketServer;

export const initSocketServer = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: config.socket.corsOrigin,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error("Socket server is not initialized");
  }

  return io;
};
```

## Backend Socket Auth Middleware

`src/middlewares/socketAuthMiddleware.ts`

```ts
import config from "@/config/config";
import { verifyToken } from "@/services/token.service";
import { AuthenticatedSocket } from "@/types/socket.types";
import { NextFunction } from "socket.io/dist/namespace";

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: NextFunction
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Unauthorized socket connection"));
    }

    const payload = await verifyToken(token, config.tokens.jwt_secret);

    if (!payload) {
      return next(new Error("Invalid socket token"));
    }

    socket.user = payload as AuthenticatedSocket["user"];
    next();
  } catch (error) {
    next(new Error("Socket authentication failed"));
  }
};
```

## Backend Chat Service

`src/services/chat.service.ts`

```ts
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import ApiError, { StatusCodes } from "@/modules/apiError.module";
import { ConversationType, ISendMessagePayload, MessageStatus, MessageType } from "@/types/chat.types";
import { Types } from "mongoose";

export const createDirectConversation = async (authUserId: string, receiverId: string) => {
  if (authUserId === receiverId) {
    throw new ApiError("You cannot create conversation with yourself", StatusCodes.BAD_REQUEST);
  }

  const existingConversation = await Conversation.findOne({
    type: ConversationType.direct,
    "participants.user": { $all: [authUserId, receiverId] },
  }).populate("participants.user", "username name email image");

  if (existingConversation) {
    return existingConversation;
  }

  return await Conversation.create({
    type: ConversationType.direct,
    createdBy: authUserId,
    participants: [
      { user: authUserId },
      { user: receiverId },
    ],
  });
};

export const createGroupConversation = async (
  authUserId: string,
  title: string,
  participantIds: string[]
) => {
  const uniqueParticipantIds = Array.from(new Set([authUserId, ...participantIds]));

  if (uniqueParticipantIds.length < 2) {
    throw new ApiError("Group requires at least two participants", StatusCodes.BAD_REQUEST);
  }

  return await Conversation.create({
    title,
    type: ConversationType.group,
    createdBy: authUserId,
    participants: uniqueParticipantIds.map((userId) => ({ user: userId })),
  });
};

export const getUserConversations = async (authUserId: string) => {
  return await Conversation.find({
    "participants.user": authUserId,
  })
    .populate("participants.user", "username name email image")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "username name image",
      },
    })
    .sort({ updatedAt: -1 });
};

export const getConversationMessages = async (
  authUserId: string,
  conversationId: string,
  page = 1,
  limit = 30
) => {
  await assertConversationParticipant(authUserId, conversationId);

  const skip = (page - 1) * limit;

  return await Message.find({ conversation: conversationId })
    .populate("sender", "username name image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const sendMessage = async (authUserId: string, payload: ISendMessagePayload) => {
  const conversation = await assertConversationParticipant(authUserId, payload.conversationId);

  if (!payload.body && !payload.attachments?.length) {
    throw new ApiError("Message body or attachment is required", StatusCodes.BAD_REQUEST);
  }

  const message = await Message.create({
    conversation: payload.conversationId,
    sender: authUserId,
    body: payload.body,
    type: payload.type || MessageType.text,
    attachments: payload.attachments || [],
    status: MessageStatus.sent,
    readBy: [new Types.ObjectId(authUserId)],
  });

  conversation.lastMessage = message._id as Types.ObjectId;
  await conversation.save();

  return await message.populate("sender", "username name image");
};

export const markConversationAsRead = async (authUserId: string, conversationId: string) => {
  const conversation = await assertConversationParticipant(authUserId, conversationId);

  const lastMessage = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });

  if (!lastMessage) {
    return conversation;
  }

  await Message.updateMany(
    {
      conversation: conversationId,
      readBy: { $ne: authUserId },
    },
    {
      $addToSet: { readBy: authUserId },
      $set: { status: MessageStatus.read },
    }
  );

  await Conversation.updateOne(
    {
      _id: conversationId,
      "participants.user": authUserId,
    },
    {
      $set: {
        "participants.$.lastReadMessage": lastMessage._id,
      },
    }
  );

  return lastMessage;
};

export const assertConversationParticipant = async (authUserId: string, conversationId: string) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    "participants.user": authUserId,
  });

  if (!conversation) {
    throw new ApiError("Conversation not found", StatusCodes.NOT_FOUND);
  }

  return conversation;
};
```

## Backend Socket Service

`src/services/socket.service.ts`

```ts
import { getSocketServer } from "@/config/socket";
import Conversation from "@/models/Conversation";
import { SocketEvents } from "@/types/socket.types";

const onlineUsers = new Map<string, string>();

export const addOnlineUser = (userId: string, socketId: string) => {
  onlineUsers.set(userId, socketId);
};

export const removeOnlineUser = (userId: string) => {
  onlineUsers.delete(userId);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

export const emitToUser = (userId: string, event: string, data: unknown) => {
  const socketId = onlineUsers.get(userId);

  if (socketId) {
    getSocketServer().to(socketId).emit(event, data);
  }
};

export const emitToConversation = async (conversationId: string, event: string, data: unknown) => {
  getSocketServer().to(getConversationRoom(conversationId)).emit(event, data);
};

export const emitConversationToParticipants = async (
  conversationId: string,
  event: string,
  data: unknown
) => {
  const conversation = await Conversation.findById(conversationId).select("participants.user");

  if (!conversation) return;

  conversation.participants.forEach((participant) => {
    emitToUser(participant.user.toString(), event, data);
  });
};

export const broadcastOnlineUsers = () => {
  getSocketServer().emit(SocketEvents.onlineUsers, getOnlineUsers());
};

export const getConversationRoom = (conversationId: string) => {
  return `conversation:${conversationId}`;
};
```

## Backend Socket Events

`src/sockets/chat.socket.ts`

```ts
import {
  addOnlineUser,
  broadcastOnlineUsers,
  emitToConversation,
  getConversationRoom,
  removeOnlineUser,
} from "@/services/socket.service";
import { markConversationAsRead, sendMessage } from "@/services/chat.service";
import { AuthenticatedSocket, SocketEvents } from "@/types/socket.types";
import { Server } from "socket.io";

export const registerChatSocket = (io: Server, socket: AuthenticatedSocket) => {
  const authUserId = socket.user?.userId;

  if (!authUserId) return;

  addOnlineUser(authUserId, socket.id);
  broadcastOnlineUsers();

  socket.on(SocketEvents.conversationJoin, (conversationId: string) => {
    socket.join(getConversationRoom(conversationId));
  });

  socket.on(SocketEvents.conversationLeave, (conversationId: string) => {
    socket.leave(getConversationRoom(conversationId));
  });

  socket.on(SocketEvents.messageSend, async (payload, callback) => {
    try {
      const message = await sendMessage(authUserId, payload);

      await emitToConversation(
        payload.conversationId,
        SocketEvents.messageNew,
        message
      );

      if (callback) callback({ ok: true, data: message });
    } catch (error: any) {
      socket.emit(SocketEvents.error, error.message || "Message sending failed");
      if (callback) callback({ ok: false, error: error.message });
    }
  });

  socket.on(SocketEvents.messageRead, async (conversationId: string) => {
    try {
      const lastMessage = await markConversationAsRead(authUserId, conversationId);

      await emitToConversation(conversationId, SocketEvents.messageRead, {
        conversationId,
        userId: authUserId,
        lastMessage,
      });
    } catch (error: any) {
      socket.emit(SocketEvents.error, error.message || "Read receipt failed");
    }
  });

  socket.on(SocketEvents.typing, async (payload) => {
    socket.to(getConversationRoom(payload.conversationId)).emit(SocketEvents.typing, {
      conversationId: payload.conversationId,
      userId: authUserId,
      isTyping: payload.isTyping,
    });
  });

  socket.on(SocketEvents.disconnect, () => {
    removeOnlineUser(authUserId);
    broadcastOnlineUsers();
  });
};
```

`src/sockets/index.ts`

```ts
import { socketAuthMiddleware } from "@/middlewares/socketAuthMiddleware";
import { registerChatSocket } from "@/sockets/chat.socket";
import { AuthenticatedSocket, SocketEvents } from "@/types/socket.types";
import { Server } from "socket.io";

export const registerSockets = (io: Server) => {
  io.use(socketAuthMiddleware);

  io.on(SocketEvents.connection, (socket: AuthenticatedSocket) => {
    registerChatSocket(io, socket);
  });
};
```

## Backend App Update

Update your `App` class to initialize sockets after creating the HTTP server.

`src/app/App.ts`

```ts
import http, { Server } from "http";
import express, { Express } from "express";
import path from "path";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import fileUpload from "express-fileupload";
import router from "@/routes/routes";
import { createStorageFolders } from "@/config/filestorage";
import config from "@/config/config";
import routeNotFoundMiddleware from "@/middlewares/routeNotFoundMiddleware";
import defaultErrorHandler from "@/middlewares/defaultErrorHandler";
import { initSocketServer } from "@/config/socket";
import { registerSockets } from "@/sockets";

class App {
  port: number;
  server!: Server;
  app!: Express;

  constructor(port: number) {
    this.port = port;
    this.serverInit();
    this.loadPlugins();
    this.loadRoutes();
    this.loadExceptionMiddlewares();
  }

  loadPlugins() {
    this.app.use(express.json());
    this.app.use(express.static(path.resolve(__dirname, "../public")));
    this.app.use("/storage", express.static(path.resolve(__dirname, "../storage")));

    this.app.use(
      cors({
        origin: [config.frontend_uri],
        optionsSuccessStatus: 200,
        credentials: true,
      })
    );

    this.app.use(helmet());
    this.app.use(cookieParser());
    this.app.use(compression());
    this.app.use(
      fileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp/",
      })
    );
  }

  loadRoutes() {
    this.app.use("/", router);
  }

  loadExceptionMiddlewares() {
    this.app.use(routeNotFoundMiddleware);
    this.app.use(defaultErrorHandler);
  }

  serverInit() {
    this.app = express();
    this.server = http.createServer(this.app);

    const io = initSocketServer(this.server);
    registerSockets(io);

    createStorageFolders();
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`[Server]: Running on http://127.0.0.1:${this.port}`);
    });
  }
}

export default App;
```

## Backend Controllers

`src/controllers/conversation.controller.ts`

```ts
import {
  createDirectConversation,
  createGroupConversation,
  getUserConversations,
} from "@/services/chat.service";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "@/modules/apiError.module";

export const createDirect = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const conversation = await createDirectConversation(req.user.userId, req.body.receiverId);

    return res.status(StatusCodes.CREATED).json({
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const createGroup = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const conversation = await createGroupConversation(
      req.user.userId,
      req.body.title,
      req.body.participantIds || []
    );

    return res.status(StatusCodes.CREATED).json({
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const index = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const conversations = await getUserConversations(req.user.userId);

    return res.status(StatusCodes.OK).json({
      conversations,
    });
  } catch (error) {
    next(error);
  }
};
```

`src/controllers/message.controller.ts`

```ts
import { getConversationMessages, markConversationAsRead, sendMessage } from "@/services/chat.service";
import { emitToConversation } from "@/services/socket.service";
import { SocketEvents } from "@/types/socket.types";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "@/modules/apiError.module";

export const index = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const messages = await getConversationMessages(
      req.user.userId,
      req.params.conversationId,
      Number(req.query.page || 1),
      Number(req.query.limit || 30)
    );

    return res.status(StatusCodes.OK).json({
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const store = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const message = await sendMessage(req.user.userId, {
      conversationId: req.params.conversationId,
      body: req.body.body,
      type: req.body.type,
      attachments: req.body.attachments,
    });

    await emitToConversation(req.params.conversationId, SocketEvents.messageNew, message);

    return res.status(StatusCodes.CREATED).json({
      message,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const lastMessage = await markConversationAsRead(req.user.userId, req.params.conversationId);

    await emitToConversation(req.params.conversationId, SocketEvents.messageRead, {
      conversationId: req.params.conversationId,
      userId: req.user.userId,
      lastMessage,
    });

    return res.status(StatusCodes.OK).json({
      message: "Conversation marked as read",
    });
  } catch (error) {
    next(error);
  }
};
```

## Backend Routes

`src/routes/conversation.routes.ts`

```ts
import { createDirect, createGroup, index } from "@/controllers/conversation.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { Router } from "express";

const conversationRouter = Router();

conversationRouter.use(authMiddleware);

conversationRouter.get("/", index);
conversationRouter.post("/direct", createDirect);
conversationRouter.post("/group", createGroup);

export default conversationRouter;
```

`src/routes/message.routes.ts`

```ts
import { index, markAsRead, store } from "@/controllers/message.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { Router } from "express";

const messageRouter = Router();

messageRouter.use(authMiddleware);

messageRouter.get("/:conversationId", index);
messageRouter.post("/:conversationId", store);
messageRouter.patch("/:conversationId/read", markAsRead);

export default messageRouter;
```

Update main route file:

`src/routes/routes.ts`

```ts
import { Router } from "express";
import conversationRouter from "@/routes/conversation.routes";
import messageRouter from "@/routes/message.routes";

const router = Router();

router.use("/api/conversations", conversationRouter);
router.use("/api/messages", messageRouter);

export default router;
```

## Frontend Folder Structure

```txt
src/
  config/
    env.ts
  lib/
    api.ts
    socket.ts
  types/
    chat.types.ts
  hooks/
    useSocket.ts
    useChat.ts
  services/
    chat.api.ts
  components/
    chat/
      ChatLayout.tsx
      ConversationList.tsx
      MessageList.tsx
      MessageInput.tsx
      TypingIndicator.tsx
```

## Frontend Config

`src/config/env.ts`

```ts
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  socketUrl: import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
};
```

## Frontend Types

`src/types/chat.types.ts`

```ts
export enum MessageType {
  text = "text",
  image = "image",
  file = "file",
  system = "system",
}

export interface User {
  _id: string;
  username: string;
  name?: string;
  image?: string;
}

export interface Conversation {
  _id: string;
  title?: string;
  type: "direct" | "group";
  participants: {
    user: User;
    joinedAt: string;
    lastReadMessage?: string;
    isMuted: boolean;
  }[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  body: string;
  type: MessageType;
  attachments: string[];
  status: "sent" | "delivered" | "read";
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  conversationId: string;
  body: string;
  type?: MessageType;
  attachments?: string[];
}
```

## Frontend API Client

`src/lib/api.ts`

```ts
import { env } from "@/config/env";

export const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
};
```

`src/services/chat.api.ts`

```ts
import { api } from "@/lib/api";
import { Conversation, Message, SendMessagePayload } from "@/types/chat.types";

export const chatApi = {
  getConversations: () => {
    return api<{ conversations: Conversation[] }>("/api/conversations");
  },

  createDirectConversation: (receiverId: string) => {
    return api<{ conversation: Conversation }>("/api/conversations/direct", {
      method: "POST",
      body: JSON.stringify({ receiverId }),
    });
  },

  createGroupConversation: (title: string, participantIds: string[]) => {
    return api<{ conversation: Conversation }>("/api/conversations/group", {
      method: "POST",
      body: JSON.stringify({ title, participantIds }),
    });
  },

  getMessages: (conversationId: string, page = 1) => {
    return api<{ messages: Message[] }>(`/api/messages/${conversationId}?page=${page}`);
  },

  sendMessage: (payload: SendMessagePayload) => {
    return api<{ message: Message }>(`/api/messages/${payload.conversationId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markAsRead: (conversationId: string) => {
    return api<{ message: string }>(`/api/messages/${conversationId}/read`, {
      method: "PATCH",
    });
  },
};
```

## Frontend Socket Client

`src/lib/socket.ts`

```ts
import { env } from "@/config/env";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = () => {
  const token = localStorage.getItem("access_token");

  if (!token) return null;

  if (!socket) {
    socket = io(env.socketUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

## Frontend Hooks

`src/hooks/useSocket.ts`

```ts
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = connectSocket();

    if (!socketInstance) return;

    setSocket(socketInstance);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
    };
  }, []);

  return {
    socket,
    isConnected,
    getSocket,
    disconnectSocket,
  };
};
```

`src/hooks/useChat.ts`

```ts
import { chatApi } from "@/services/chat.api";
import { Conversation, Message, SendMessagePayload } from "@/types/chat.types";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

const events = {
  conversationJoin: "conversation:join",
  conversationLeave: "conversation:leave",
  messageSend: "message:send",
  messageNew: "message:new",
  messageRead: "message:read",
  typing: "typing",
  onlineUsers: "users:online",
};

export const useChat = () => {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    const data = await chatApi.getConversations();
    setConversations(data.conversations);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      const data = await chatApi.getMessages(conversationId);
      setMessages(data.messages.reverse());
      await chatApi.markAsRead(conversationId);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(
    async (conversationId: string) => {
      if (socket && activeConversationId) {
        socket.emit(events.conversationLeave, activeConversationId);
      }

      setActiveConversationId(conversationId);

      if (socket) {
        socket.emit(events.conversationJoin, conversationId);
      }

      await loadMessages(conversationId);
    },
    [activeConversationId, loadMessages, socket]
  );

  const sendMessage = useCallback(
    (payload: SendMessagePayload) => {
      if (!socket) return;

      socket.emit(events.messageSend, payload, (response: { ok: boolean; error?: string }) => {
        if (!response.ok) {
          console.error(response.error);
        }
      });
    },
    [socket]
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      socket?.emit(events.typing, {
        conversationId,
        isTyping,
      });
    },
    [socket]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message: Message) => {
      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) return prev;
        return [...prev, message];
      });

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === message.conversation
            ? { ...conversation, lastMessage: message, updatedAt: message.createdAt }
            : conversation
        )
      );
    };

    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [payload.userId]: payload.isTyping,
      }));
    };

    socket.on(events.messageNew, onNewMessage);
    socket.on(events.typing, onTyping);
    socket.on(events.onlineUsers, setOnlineUsers);

    return () => {
      socket.off(events.messageNew, onNewMessage);
      socket.off(events.typing, onTyping);
      socket.off(events.onlineUsers, setOnlineUsers);
    };
  }, [socket]);

  return {
    conversations,
    activeConversationId,
    messages,
    onlineUsers,
    typingUsers,
    loading,
    loadConversations,
    selectConversation,
    sendMessage,
    sendTyping,
  };
};
```

## Frontend Components

`src/components/chat/ChatLayout.tsx`

```tsx
import { useChat } from "@/hooks/useChat";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";

export const ChatLayout = () => {
  const chat = useChat();

  return (
    <section className="grid h-screen grid-cols-[320px_1fr] bg-slate-50">
      <ConversationList
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId}
        onlineUsers={chat.onlineUsers}
        onSelect={chat.selectConversation}
      />

      <main className="flex min-w-0 flex-col border-l bg-white">
        <MessageList messages={chat.messages} loading={chat.loading} />

        {chat.activeConversationId && (
          <MessageInput
            conversationId={chat.activeConversationId}
            onSend={chat.sendMessage}
            onTyping={chat.sendTyping}
          />
        )}
      </main>
    </section>
  );
};
```

`src/components/chat/ConversationList.tsx`

```tsx
import { Conversation } from "@/types/chat.types";

interface Props {
  conversations: Conversation[];
  activeConversationId: string;
  onlineUsers: string[];
  onSelect: (conversationId: string) => void;
}

export const ConversationList = ({
  conversations,
  activeConversationId,
  onlineUsers,
  onSelect,
}: Props) => {
  return (
    <aside className="min-w-0 bg-white">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">Chats</h2>
      </div>

      <div className="divide-y">
        {conversations.map((conversation) => {
          const title =
            conversation.title ||
            conversation.participants.map((participant) => participant.user.username).join(", ");

          const isActive = activeConversationId === conversation._id;
          const isOnline = conversation.participants.some((participant) =>
            onlineUsers.includes(participant.user._id)
          );

          return (
            <button
              key={conversation._id}
              onClick={() => onSelect(conversation._id)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left ${
                isActive ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {conversation.lastMessage?.body || "No messages yet"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
```

`src/components/chat/MessageList.tsx`

```tsx
import { Message } from "@/types/chat.types";

interface Props {
  messages: Message[];
  loading: boolean;
}

export const MessageList = ({ messages, loading }: Props) => {
  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading messages...</div>;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
      {messages.map((message) => (
        <div key={message._id} className="max-w-[70%] rounded-lg bg-slate-100 px-3 py-2">
          <div className="mb-1 text-xs font-medium text-slate-600">
            {message.sender.name || message.sender.username}
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-900">{message.body}</p>
        </div>
      ))}
    </div>
  );
};
```

`src/components/chat/MessageInput.tsx`

```tsx
import { MessageType, SendMessagePayload } from "@/types/chat.types";
import { FormEvent, useRef, useState } from "react";

interface Props {
  conversationId: string;
  onSend: (payload: SendMessagePayload) => void;
  onTyping: (conversationId: string, isTyping: boolean) => void;
}

export const MessageInput = ({ conversationId, onSend, onTyping }: Props) => {
  const [body, setBody] = useState("");
  const typingTimeout = useRef<number | null>(null);

  const handleTyping = (value: string) => {
    setBody(value);
    onTyping(conversationId, true);

    if (typingTimeout.current) {
      window.clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = window.setTimeout(() => {
      onTyping(conversationId, false);
    }, 800);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!body.trim()) return;

    onSend({
      conversationId,
      body: body.trim(),
      type: MessageType.text,
    });

    setBody("");
    onTyping(conversationId, false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 border-t px-4 py-3">
      <input
        value={body}
        onChange={(event) => handleTyping(event.target.value)}
        placeholder="Type a message"
        className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Send
      </button>
    </form>
  );
};
```

## Environment Variables

Backend `.env`:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/your_db
FRONTEND_URI=http://localhost:5173
SOCKET_CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ADMIN_JWT_SECRET=your_admin_secret
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Recommended Integration Flow

1. Add backend models: `Conversation.ts`, `Message.ts`.
2. Add socket config: `config/socket.ts`.
3. Add socket auth middleware and socket event files.
4. Update `App.ts` to initialize Socket.IO on the existing HTTP server.
5. Add REST routes for conversations and messages.
6. On frontend login, save `access_token` in `localStorage`.
7. Mount `ChatLayout` only after the user is authenticated.

## Important Notes

- Socket authentication uses the same JWT token as your `authMiddleware`.
- REST API is still useful for loading old conversations and messages.
- Socket events are used for realtime delivery, typing, read receipts, and online users.
- For production with multiple Node instances, replace the in-memory `onlineUsers` map with Redis and use `@socket.io/redis-adapter`.

