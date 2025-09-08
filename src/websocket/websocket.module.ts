import { Module } from '@nestjs/common';
import { WebSocketGatewayHandler } from './websocket.gateway';

@Module({
  providers: [WebSocketGatewayHandler],
  exports: [WebSocketGatewayHandler],
})
export class WebSocketModule {}
