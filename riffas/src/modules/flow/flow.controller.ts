import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FlowService } from './flow.service';

@Controller('flow')
export class FlowController {
  constructor(private readonly flowService: FlowService) {}

  // Endpoint para recibir callback/notificación de Flow
  @Post('callback')
  handleCallback(@Body() body: any) {
    console.log("🚀 ~ FlowController ~ handleCallback ~ body:", body)
    return this.flowService.handleCallback(body);
  }

  @Post('return')
  async handleReturn(@Body() body: any, @Res() res: Response) {
    const redirectUrl = await this.flowService.handleReturn(body);
    return res.redirect(303, redirectUrl);
  }

  @Get('return')
  async handleReturnGet(@Query('token') token: string, @Res() res: Response) {
    const redirectUrl = await this.flowService.handleReturn({ token });
    return res.redirect(303, redirectUrl);
  }
}
