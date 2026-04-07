import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Task } from '../tasks/entities/task.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(@ConnectedSocket() client: Socket): void {
    const rawUserId = client.handshake.auth?.userId ?? client.handshake.query.userId;

    if (typeof rawUserId === 'string' && rawUserId.trim()) {
      client.join(rawUserId);
    }
  }

  notifyTaskCreated(task: Task): void {
    this.server.emit('task:created', task);
  }

  notifyTaskUpdated(task: Task): void {
    this.server.emit('task:updated', task);
  }

  notifyTaskAssigned(task: Task): void {
    if (task.assigneeId) {
      this.server.to(task.assigneeId).emit('task:assigned', task);
    }
  }
}
