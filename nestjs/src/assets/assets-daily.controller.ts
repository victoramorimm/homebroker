import { Controller, Get, MessageEvent, Param, Sse } from '@nestjs/common';
import { AssetsDailyService } from './assets-daily.service';
import { Observable, map } from 'rxjs';

@Controller('assets/:id/daily')
export class AssetsDailyController {
  constructor(private readonly assetsDailyService: AssetsDailyService) {}

  @Get()
  all(@Param('id') id: string) {
    return this.assetsDailyService.findAll(id);
  }
  @Sse('events')
  events(@Param('id') id: string): Observable<MessageEvent> {
    return this.assetsDailyService.subscribeEvents(id).pipe(
      map((event) => ({
        type: event.event,
        data: event.data,
      })),
    );
  }
}
