import { RafflesService } from './raffles.service';

const execResult = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

describe('RafflesService document requirements', () => {
  let savedRaffle: any;
  let raffleModel: any;
  let ticketModel: any;
  let s3Service: { uploadImage: jest.Mock };
  let service: RafflesService;

  beforeEach(() => {
    savedRaffle = undefined;

    raffleModel = jest.fn().mockImplementation((doc) => {
      savedRaffle = {
        ...doc,
        _id: 'raffle-1',
        save: jest.fn().mockResolvedValue(undefined),
      };
      return savedRaffle;
    });
    raffleModel.find = jest.fn();
    raffleModel.findById = jest.fn();
    raffleModel.findByIdAndUpdate = jest.fn();

    ticketModel = {
      find: jest.fn(),
      findById: jest.fn(),
    };

    s3Service = {
      uploadImage: jest
        .fn()
        .mockImplementation((_buffer, _mime, key) =>
          Promise.resolve(`https://cdn.test/${key}`),
        ),
    };

    service = new RafflesService(
      raffleModel as any,
      ticketModel as any,
      s3Service as any,
      { sendWinnerNotification: jest.fn() } as any,
    );
  });

  it('creates a raffle with sale dates, stickers, images and package options', async () => {
    const result = await service.create(
      {
        titulo: 'Rifa prueba',
        subtitulo: 'Promo',
        descripcion: 'Premio principal',
        condiciones: 'Bases legales',
        precioTicket: 1000,
        totalTickets: 100,
        limitePorUsuario: 10,
        fechaCierre: new Date('2026-06-10T04:00:00.000Z'),
        fechaInicioVenta: new Date('2026-06-01T04:00:00.000Z'),
        fechaTerminoVenta: new Date('2026-06-09T04:00:00.000Z'),
        fechaSorteo: new Date('2026-06-10T04:00:00.000Z'),
        paquetes: [
          { cantidad: 1, precio: 1000, etiqueta: '1 sticker' },
          { cantidad: 6, precio: 5000, etiqueta: '6 stickers' },
          { cantidad: 13, precio: 10000, etiqueta: '13 stickers' },
        ],
      } as any,
      {
        imagenes: [
          { buffer: Buffer.from('img'), mimetype: 'image/png' } as any,
        ],
        stickers: [
          { buffer: Buffer.from('sticker'), mimetype: 'image/png' } as any,
        ],
      },
    );

    expect(result).toBe(savedRaffle);
    expect(savedRaffle.estado).toBe('ACTIVA');
    expect(savedRaffle.subtitulo).toBe('Promo');
    expect(savedRaffle.condiciones).toBe('Bases legales');
    expect(savedRaffle.fechaInicioVenta).toEqual(
      new Date('2026-06-01T04:00:00.000Z'),
    );
    expect(savedRaffle.fechaTerminoVenta).toEqual(
      new Date('2026-06-09T04:00:00.000Z'),
    );
    expect(savedRaffle.paquetes).toEqual([
      { cantidad: 1, precio: 1000, etiqueta: '1 sticker' },
      { cantidad: 6, precio: 5000, etiqueta: '6 stickers' },
      { cantidad: 13, precio: 10000, etiqueta: '13 stickers' },
    ]);
    expect(savedRaffle.imagenes).toHaveLength(1);
    expect(savedRaffle.stickers).toHaveLength(1);
    expect(savedRaffle.save).toHaveBeenCalled();
  });

  it('creates a default one-ticket package when no custom packages are provided', async () => {
    await service.create({
      titulo: 'Rifa simple',
      descripcion: 'Premio',
      precioTicket: 2500,
      totalTickets: 50,
      limitePorUsuario: 5,
      fechaCierre: new Date('2026-06-10T04:00:00.000Z'),
    } as any);

    expect(savedRaffle.paquetes).toEqual([
      { cantidad: 1, precio: 2500, etiqueta: '1 ticket' },
    ]);
  });

  it('returns only active raffles for the public catalog', async () => {
    const active = [{ _id: 'raffle-1', estado: 'ACTIVA' }];
    raffleModel.find.mockReturnValue(execResult(active));

    await expect(service.findPublicActivas()).resolves.toBe(active as any);
    expect(raffleModel.find).toHaveBeenCalledWith({ estado: 'ACTIVA' });
  });
});
