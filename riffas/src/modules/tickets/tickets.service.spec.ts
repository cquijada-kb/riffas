import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';

const chain = <T>(value: T) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

const execResult = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

function buildTicketModel() {
  const model: any = jest.fn().mockImplementation((doc) => ({
    ...doc,
    _id: `ticket-${doc.numero}`,
  }));
  model.find = jest.fn();
  model.findById = jest.fn();
  model.insertMany = jest.fn();
  model.updateMany = jest.fn();
  model.deleteMany = jest.fn();
  return model;
}

function buildRaffle(overrides: Record<string, any> = {}) {
  return {
    _id: 'raffle-1',
    titulo: 'Rifa prueba',
    estado: 'ACTIVA',
    totalTickets: 10,
    ticketsVendidos: 0,
    precioTicket: 1000,
    limitePorUsuario: 10,
    fechaInicioVenta: null,
    fechaTerminoVenta: null,
    imagenes: ['https://cdn.test/raffle.png'],
    stickers: ['https://cdn.test/sticker.png'],
    paquetes: [
      { cantidad: 1, precio: 1000, etiqueta: '1 sticker' },
      { cantidad: 6, precio: 5000, etiqueta: '6 stickers' },
    ],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('TicketsService document requirements', () => {
  let ticketModel: any;
  let raffleModel: any;
  let s3Service: { uploadImage: jest.Mock; getObjectByUrl: jest.Mock };
  let mailService: { sendTicketLookupVerification: jest.Mock };
  let service: TicketsService;

  beforeEach(() => {
    ticketModel = buildTicketModel();
    raffleModel = {
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    s3Service = {
      uploadImage: jest
        .fn()
        .mockImplementation((_buffer, _mime, key) =>
          Promise.resolve(`https://s3.test/${key}`),
        ),
      getObjectByUrl: jest.fn().mockResolvedValue({
        ContentType: 'image/png',
        Body: 'stream',
      }),
    };
    mailService = {
      sendTicketLookupVerification: jest.fn().mockResolvedValue(undefined),
    };
    process.env.JWT_SECRET = 'test-secret';
    process.env.PUBLIC_FRONTEND_URL = 'http://public.test';

    service = new TicketsService(
      ticketModel as any,
      raffleModel as any,
      s3Service as any,
      mailService as any,
    );
  });

  it('creates a manual transfer purchase with package price, receipt and pending tickets', async () => {
    const raffle = buildRaffle();
    raffleModel.findById.mockReturnValue(execResult(raffle));
    ticketModel.find.mockReturnValue(execResult([]));
    ticketModel.insertMany.mockImplementation((docs: any[]) =>
      Promise.resolve(docs.map((doc) => ({ ...doc, _id: `saved-${doc.numero}` }))),
    );

    const result = await service.createManualPurchase(
      'raffle-1',
      {
        compradorNombre: 'Cliente Prueba',
        compradorEmail: 'CLIENTE@MAIL.COM',
        compradorTelefono: '999',
        compradorRut: '11.111.111-1',
        compradorCiudad: 'Concepcion',
        cantidad: 6,
        paqueteId: '1',
      },
      {
        originalname: 'comprobante.png',
        mimetype: 'image/png',
        buffer: Buffer.from('receipt'),
      } as any,
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe('PENDING');
    expect(result.totalAmount).toBe(5000);
    expect(result.quantity).toBe(6);
    expect(result.comprobanteUrl).toContain('/payments/MANUAL-');
    expect(ticketModel.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          estado: 'PENDIENTE',
          compradorEmail: 'cliente@mail.com',
          metodoPago: 'Transferencia',
          montoPagoTotal: 5000,
          paqueteCantidad: 6,
          paquetePrecio: 5000,
          comprobanteUrl: expect.stringContaining('/payments/MANUAL-'),
        }),
      ]),
    );
    expect(raffle.ticketsVendidos).toBe(6);
    expect(raffle.save).toHaveBeenCalled();
  });

  it('rejects manual purchases outside the configured sale date range', async () => {
    const raffle = buildRaffle({
      fechaInicioVenta: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    raffleModel.findById.mockReturnValue(execResult(raffle));

    await expect(
      service.createManualPurchase('raffle-1', {
        compradorNombre: 'Cliente',
        compradorEmail: 'cliente@mail.com',
        cantidad: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects purchases that exceed the user limit', async () => {
    const raffle = buildRaffle({ limitePorUsuario: 2 });
    raffleModel.findById.mockReturnValue(execResult(raffle));

    await expect(
      service.createManualPurchase('raffle-1', {
        compradorNombre: 'Cliente',
        compradorEmail: 'cliente@mail.com',
        cantidad: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds the admin ticket grid with sold, pending and available boxes', async () => {
    raffleModel.findById.mockReturnValue(chain(buildRaffle({ totalTickets: 4 })));
    ticketModel.find.mockReturnValue(
      chain([
        {
          _id: 'ticket-1',
          raffleId: 'raffle-1',
          numero: 1,
          estado: 'PAGADO',
          compradorNombre: 'Pagado',
          compradorEmail: 'pagado@mail.com',
        },
        {
          _id: 'ticket-3',
          raffleId: 'raffle-1',
          numero: 3,
          estado: 'PENDIENTE',
          compradorNombre: 'Pendiente',
          compradorEmail: 'pendiente@mail.com',
        },
      ]),
    );

    const result = await service.getTicketsByRaffle('raffle-1');

    expect(result.summary).toEqual({
      total: 4,
      vendidos: 1,
      porVerificar: 1,
      disponibles: 2,
    });
    expect(result.items.map((item) => item.estado)).toEqual([
      'VENDIDO',
      'DISPONIBLE',
      'POR_VERIFICAR',
      'DISPONIBLE',
    ]);
  });

  it('returns public ticket lookup with raffle image and stickers by buyer email', async () => {
    ticketModel.find.mockReturnValue(
      chain([
        {
          _id: 'ticket-1',
          raffleId: 'raffle-1',
          numero: 7,
          estado: 'PAGADO',
          compradorNombre: 'Cliente',
          compradorEmail: 'cliente@mail.com',
          flowOrderId: 'ORDER-1',
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
        },
      ]),
    );
    raffleModel.find.mockReturnValue(chain([buildRaffle()]));

    const result = await service.getPublicTicketsByEmail(' CLIENTE@MAIL.COM ');

    expect(result.email).toBe('cliente@mail.com');
    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        numero: 7,
        estado: 'VENDIDO',
        raffleImagen: 'https://cdn.test/raffle.png',
        stickers: ['https://cdn.test/sticker.png'],
      }),
    );
  });

  it('sends a verification email before public ticket lookup details are shown', async () => {
    const response = await service.requestPublicTicketLookup(' CLIENTE@MAIL.COM ');

    expect(response.ok).toBe(true);
    expect(mailService.sendTicketLookupVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cliente@mail.com',
        verificationUrl: expect.stringContaining('http://public.test/consultar-stickers?token='),
        expiresMinutes: 30,
      }),
    );
  });

  it('rejects malformed emails before sending a lookup verification email', async () => {
    await expect(
      service.requestPublicTicketLookup('cliente-mail.com'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mailService.sendTicketLookupVerification).not.toHaveBeenCalled();
  });

  it('rejects malformed emails before returning public ticket details', async () => {
    await expect(
      service.getPublicTicketsByEmail('cliente-mail.com'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(ticketModel.find).not.toHaveBeenCalled();
  });

  it('returns ticket lookup only when the verification token is valid', async () => {
    await service.requestPublicTicketLookup('cliente@mail.com');
    const lastCall =
      mailService.sendTicketLookupVerification.mock.calls[
        mailService.sendTicketLookupVerification.mock.calls.length - 1
      ];
    const verificationUrl =
      lastCall[0].verificationUrl;
    const token = new URL(verificationUrl).searchParams.get('token')!;

    ticketModel.find.mockReturnValue(
      chain([
        {
          _id: 'ticket-1',
          raffleId: 'raffle-1',
          numero: 7,
          estado: 'PAGADO',
          compradorNombre: 'Cliente',
          compradorEmail: 'cliente@mail.com',
        },
      ]),
    );
    raffleModel.find.mockReturnValue(chain([buildRaffle()]));

    const result = await service.getPublicTicketsByLookupToken(token);

    expect(result.email).toBe('cliente@mail.com');
    expect(result.total).toBe(1);
  });

  it('returns payment detail with proxied receipt URL instead of private S3 direct URL', async () => {
    ticketModel.find.mockReturnValue(
      chain([
        {
          _id: 'ticket-1',
          raffleId: 'raffle-1',
          numero: 2,
          estado: 'PENDIENTE',
          compradorNombre: 'Cliente',
          compradorEmail: 'cliente@mail.com',
          flowOrderId: 'MANUAL-1',
          metodoPago: 'Transferencia',
          montoPagoTotal: 1000,
          comprobanteUrl: 'https://s3.test/payments/MANUAL-1/receipt.png',
        },
      ]),
    );
    raffleModel.findById.mockReturnValue(chain(buildRaffle()));

    const detail = await service.getPaymentDetail('MANUAL-1');

    expect(detail.metodo).toBe('Transferencia');
    expect(detail.estado).toBe('Pendiente');
    expect(detail.comprobanteUrl).toBe(
      '/api/admin/payments/MANUAL-1/receipt/view',
    );
    expect((detail as any).comprobanteOriginalUrl).toBe(
      'https://s3.test/payments/MANUAL-1/receipt.png',
    );
  });

  it('serves private payment receipts through the backend S3 proxy', async () => {
    ticketModel.find.mockReturnValue(
      chain([
        {
          _id: 'ticket-1',
          flowOrderId: 'MANUAL-1',
          comprobanteUrl: 'https://s3.test/payments/MANUAL-1/receipt.png',
        },
      ]),
    );

    await expect(service.getPaymentReceipt('MANUAL-1')).resolves.toEqual({
      ContentType: 'image/png',
      Body: 'stream',
    });
    expect(s3Service.getObjectByUrl).toHaveBeenCalledWith(
      'https://s3.test/payments/MANUAL-1/receipt.png',
    );
  });

  it('rejects a pending payment and releases its tickets from sold count', async () => {
    ticketModel.find.mockReturnValue(
      chain([
        { _id: 'ticket-1', raffleId: 'raffle-1', flowOrderId: 'MANUAL-1' },
        { _id: 'ticket-2', raffleId: 'raffle-1', flowOrderId: 'MANUAL-1' },
      ]),
    );
    ticketModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
    raffleModel.findByIdAndUpdate.mockReturnValue(execResult({}));

    await expect(service.rejectPayment('MANUAL-1')).resolves.toEqual({
      ok: true,
      rejected: 2,
    });
    expect(ticketModel.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['ticket-1', 'ticket-2'] } },
      { $set: { estado: 'RECHAZADO', rejectedAt: expect.any(Date) } },
    );
    expect(raffleModel.findByIdAndUpdate).toHaveBeenCalledWith('raffle-1', {
      $inc: { ticketsVendidos: -2 },
    });
  });

  it('throws NotFound when a payment receipt does not exist', async () => {
    ticketModel.find.mockReturnValue(chain([{ _id: 'ticket-1' }]));

    await expect(service.getPaymentReceipt('missing-receipt')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
