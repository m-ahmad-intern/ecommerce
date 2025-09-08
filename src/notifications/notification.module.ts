import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebSocketModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
