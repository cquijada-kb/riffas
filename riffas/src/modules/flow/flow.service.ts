import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service';
import { buildFlowSignature } from './flow-signature.util';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { MailService } from '../mail/mail.service';

@Injectable()
export class FlowService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly mailService: MailService
  ) {}

  async handleCallback(body: any) {
    const result = await this.processFlowNotification(body);

    return {
      ok: true,
      flowOrderId: result.flowOrderId,
      status: result.status,
      from: result.from,
    };
  }

  async handleReturn(body: any) {
    const result = await this.processFlowNotification(body);
    const frontendBaseUrl = (
      process.env.PUBLIC_FRONTEND_URL ||
      process.env.FLOW_PUBLIC_RETURN_URL ||
      'http://localhost:4200'
    ).trim();

    const redirectUrl = new URL('/flow/retorno', frontendBaseUrl);
    redirectUrl.searchParams.set('flowOrderId', result.flowOrderId);
    redirectUrl.searchParams.set('status', this.mapFlowStatusToPublic(result.status));

    return redirectUrl.toString();
  }

  private async processFlowNotification(body: any): Promise<{
    flowOrderId: string;
    status: number;
    from: 'getStatus' | 'callback-firmado';
  }> {
    const baseUrl = process.env.FLOW_BASE_URL || 'https://sandbox.flow.cl';
    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;

    if (!apiKey) {
      throw new BadRequestException('FLOW_API_KEY no configurada');
    }

    const token = body.token;
    if (token && !body.flowOrder && !body.flowOrderId) {
      return this.resolveFlowStatusFromToken(token, apiKey, secretKey, baseUrl);
    }

    const receivedSignature: string | undefined = body.s;

    if (!secretKey) {
      const flowOrderId = body.flowOrderId || body.flowOrder || body.commerceOrder;
      if (!flowOrderId) {
        throw new BadRequestException('flowOrderId no presente en callback');
      }

      await this.ticketsService.markTicketsPaidByOrder(flowOrderId);
      return {
        flowOrderId,
        status: 2,
        from: 'callback-firmado',
      };
    }

    if (!receivedSignature) {
      throw new UnauthorizedException('Firma (s) no presente en callback');
    }

    const { s, ...toSign } = body;
    const expectedSignature = buildFlowSignature(toSign, secretKey);

    if (expectedSignature !== receivedSignature) {
      throw new UnauthorizedException('Firma de Flow invalida');
    }

    const flowOrderId = toSign.flowOrderId || toSign.flowOrder || toSign.commerceOrder;
    if (!flowOrderId) {
      throw new BadRequestException('Callback sin identificador de orden');
    }

    await this.ticketsService.markTicketsPaidByOrder(flowOrderId);

    return {
      flowOrderId,
      status: 2,
      from: 'callback-firmado',
    };
  }

  private async resolveFlowStatusFromToken(
    token: string,
    apiKey: string,
    secretKey: string | undefined,
    baseUrl: string,
  ) {
    if (!secretKey) {
      throw new BadRequestException('FLOW_SECRET_KEY no configurada, no se puede consultar getStatus');
    }

    const params: Record<string, string | number> = {
      apiKey,
      token,
    };

    const signature = buildFlowSignature(params, secretKey);
    const qs = new URLSearchParams({
      apiKey,
      token,
      s: signature,
    });

    let data: any;
    try {
      const url = `${baseUrl}/api/payment/getStatus?${qs.toString()}`;
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      data = response.data;
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data?.message || 'Error al consultar estado del pago',
      );
    }

    const flowOrderId = String(data.flowOrder || '');
    const status = Number(data.status);

    if (!flowOrderId) {
      throw new BadRequestException('getStatus no devolvio flowOrder valido');
    }

    if (status === 2) {
      await this.ticketsService.markTicketsPaidByOrder(flowOrderId);
      await this.sendConfirmationMail(flowOrderId);
    }

    return {
      flowOrderId,
      status,
      from: 'getStatus' as const,
    };
  }

  private async sendConfirmationMail(flowOrderId: string) {
    const tickets = await this.ticketsService.findTicketsByFlowOrder(flowOrderId);
    if (!tickets.length) {
      return;
    }

    const first = tickets[0];
    const raffle = await (this.ticketsService as any)['raffleModel']
      .findById(first.raffleId)
      .exec();

    const numeros = tickets.map((ticket: any) => ticket.numero);
    const montoTotal = Number(raffle?.precioTicket ?? 0) * tickets.length;

    await this.mailService.sendPaymentConfirmation({
      to: first.compradorEmail ?? '',
      nombre: first.compradorNombre ?? 'Cliente',
      raffleTitulo: raffle?.titulo ?? 'Rifa',
      flowOrderId,
      montoTotal,
      numeros,
    });
  }

  private mapFlowStatusToPublic(status: number): 'PAID' | 'FAILED' | 'PENDING' {
    if (status === 2) {
      return 'PAID';
    }

    if (status === 1 || status === 3) {
      return 'PENDING';
    }

    return 'FAILED';
  }
}
