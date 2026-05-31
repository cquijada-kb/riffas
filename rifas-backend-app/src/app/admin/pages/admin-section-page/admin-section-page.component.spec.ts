import { of } from 'rxjs';
import { AdminSectionPageComponent } from './admin-section-page.component';
import { AdminBuyerItem, AdminSystemUserItem } from '../../services/admin-users.service';

describe('AdminSectionPageComponent document workflows', () => {
  let component: AdminSectionPageComponent;
  let adminUsersService: any;
  let adminPaymentsService: any;

  const systemUser: AdminSystemUserItem = {
    id: 'admin-1',
    nombre: 'Admin Principal',
    email: 'admin@riffas.local',
    rol: 'ADMIN',
    estado: 'Activo',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  };

  const buyer: AdminBuyerItem = {
    id: 'cliente@mail.com',
    nombre: 'Cliente Demo',
    email: 'cliente@mail.com',
    telefono: '999999999',
    rut: '11.111.111-1',
    ciudad: 'Concepcion',
    ticketsComprados: 2,
    rifasParticipadas: 1,
    montoTotal: 5000,
    estado: 'Pendiente',
    updatedAt: '2026-05-03T00:00:00.000Z',
  };

  beforeEach(() => {
    adminUsersService = {
      getUsers: jasmine.createSpy('getUsers').and.returnValue(of({
        summary: {
          totalUsuarios: 1,
          administradores: 1,
          participantes: 1,
          compradores: 1,
          ganadores: 0,
          nuevosHoy: 0,
          ticketsTotales: 2,
        },
        items: [systemUser],
        systemUsers: [systemUser],
        buyers: [buyer],
        winners: [],
      })),
      getBuyerDetail: jasmine.createSpy('getBuyerDetail').and.returnValue(of({
        id: buyer.email,
        nombre: buyer.nombre,
        email: buyer.email,
        telefono: buyer.telefono,
        rut: buyer.rut,
        ciudad: buyer.ciudad,
        ticketsComprados: 2,
        rifasParticipadas: 1,
        montoTotal: 5000,
        tickets: [
          {
            ticketId: 'ticket-1',
            numero: 12,
            estado: 'PENDIENTE',
            estadoLabel: 'Por verificar',
            raffleId: 'raffle-1',
            raffleTitulo: 'Rifa Demo',
            compradorNombre: buyer.nombre,
            compradorEmail: buyer.email,
            montoTotal: 5000,
            flowOrderId: 'MANUAL-1',
            createdAt: '2026-05-03T00:00:00.000Z',
          },
        ],
      })),
    };

    adminPaymentsService = {
      getPayments: jasmine.createSpy('getPayments').and.returnValue(of({
        summary: {
          volumen24h: 5000,
          transacciones24h: 1,
          pagosPendientes: 5000,
          solicitudesPendientes: 1,
          metodoPredominante: 'Transferencia',
          totalResultados: 1,
        },
        items: [
          {
            id: 'MANUAL-1',
            flowOrderId: 'MANUAL-1',
            compradorNombre: buyer.nombre,
            compradorEmail: buyer.email,
            raffleId: 'raffle-1',
            raffleTitulo: 'Rifa Demo',
            cantidadTickets: 2,
            montoTotal: 5000,
            estado: 'Pendiente',
            metodo: 'Transferencia',
            numeros: [12, 13],
            rawTicketText: '12, 13',
          },
        ],
      })),
      getPaymentDetail: jasmine.createSpy('getPaymentDetail').and.returnValue(of({
        id: 'MANUAL-1',
        flowOrderId: 'MANUAL-1',
        compradorNombre: buyer.nombre,
        compradorEmail: buyer.email,
        raffleId: 'raffle-1',
        raffleTitulo: 'Rifa Demo',
        cantidadTickets: 2,
        montoTotal: 5000,
        estado: 'Pendiente',
        metodo: 'Transferencia',
        numeros: [12, 13],
        comprobanteUrl: '/api/admin/payments/MANUAL-1/receipt/view',
      })),
      uploadReceipt: jasmine.createSpy('uploadReceipt').and.returnValue(of({
        id: 'MANUAL-1',
        flowOrderId: 'MANUAL-1',
        compradorNombre: buyer.nombre,
        compradorEmail: buyer.email,
        raffleId: 'raffle-1',
        raffleTitulo: 'Rifa Demo',
        cantidadTickets: 2,
        montoTotal: 5000,
        estado: 'Pendiente',
        metodo: 'Transferencia',
        numeros: [12, 13],
        comprobanteUrl: '/api/admin/payments/MANUAL-1/receipt/view',
      })),
      confirmPayment: jasmine.createSpy('confirmPayment').and.returnValue(of({})),
      rejectPayment: jasmine.createSpy('rejectPayment').and.returnValue(of({ ok: true, rejected: 2 })),
    };

    component = new AdminSectionPageComponent(
      { snapshot: { data: { section: 'Usuarios' } } } as any,
      adminUsersService,
      adminPaymentsService,
      { getSummary: jasmine.createSpy('getSummary') } as any,
    );
    component.systemUsers = [systemUser];
    component.buyers = [buyer];
  });

  it('filters buyers by phone, rut, city and email as requested in Users', () => {
    component.selectedUserView = 'compradores';
    component.userSearch = '999';
    expect(component.filteredBuyers).toEqual([buyer]);

    component.userSearch = '11.111';
    expect(component.filteredBuyers).toEqual([buyer]);

    component.userSearch = 'concepcion';
    expect(component.filteredBuyers).toEqual([buyer]);

    component.userSearch = 'nadie';
    expect(component.filteredBuyers).toEqual([]);
  });

  it('opens buyer detail with purchased tickets', () => {
    component.viewBuyerDetail(buyer);

    expect(adminUsersService.getBuyerDetail).toHaveBeenCalledWith(buyer.email);
    expect(component.selectedBuyer?.tickets[0]).toEqual(
      jasmine.objectContaining({
        numero: 12,
        estadoLabel: 'Por verificar',
        raffleTitulo: 'Rifa Demo',
      }),
    );
  });

  it('opens system user detail for admins or registered users without purchases', () => {
    component.viewSystemUserDetail(systemUser);

    expect(component.selectedSystemUser).toBe(systemUser);
    expect(component.selectedBuyer).toBeUndefined();
  });

  it('filters payments by ticket number from rawTicketText', () => {
    (component as any).loadPayments();
    component.paymentSearch = '13';

    expect(component.filteredPayments.length).toBe(1);
    expect(component.filteredPayments[0].method).toBe('Transferencia');
  });

  it('loads payment detail with backend-proxied receipt URL', () => {
    component.viewPaymentDetail({ id: 'MANUAL-1' });

    expect(component.selectedPayment?.comprobanteUrl).toBe(
      '/api/admin/payments/MANUAL-1/receipt/view',
    );
    expect(component.paymentReceiptUrl).toBe(
      '/api/admin/payments/MANUAL-1/receipt/view',
    );
  });

  it('uploads a receipt from admin and refreshes the payment detail', () => {
    component.selectedPayment = {
      id: 'MANUAL-1',
      flowOrderId: 'MANUAL-1',
      compradorNombre: buyer.nombre,
      compradorEmail: buyer.email,
      raffleId: 'raffle-1',
      raffleTitulo: 'Rifa Demo',
      cantidadTickets: 2,
      montoTotal: 5000,
      estado: 'Pendiente',
      metodo: 'Transferencia',
      numeros: [12, 13],
    } as any;
    component.selectedReceiptFile = new File(['demo'], 'comprobante.png', {
      type: 'image/png',
    });

    component.uploadSelectedReceipt();

    expect(adminPaymentsService.uploadReceipt).toHaveBeenCalledWith(
      'MANUAL-1',
      jasmine.any(File),
    );
    expect(component.paymentReceiptUrl).toBe(
      '/api/admin/payments/MANUAL-1/receipt/view',
    );
  });
});
