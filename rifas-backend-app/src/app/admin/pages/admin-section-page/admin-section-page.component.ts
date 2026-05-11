import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AdminBuyerItem,
  AdminSystemUserItem,
  AdminUsersService,
  AdminUsersSummary,
  AdminWinnerItem
} from '../../services/admin-users.service';
import {
  AdminPaymentItem,
  AdminPaymentsService,
  AdminPaymentsSummary
} from '../../services/admin-payments.service';
import {
  AdminTraceabilityService,
  TraceabilityActiveUser,
  TraceabilityForensicReport,
  TraceabilityStat,
  TraceabilityTimelineEntry
} from '../../services/admin-traceability.service';

@Component({
  selector: 'app-admin-section-page',
  templateUrl: './admin-section-page.component.html',
  styleUrls: ['./admin-section-page.component.scss']
})
export class AdminSectionPageComponent implements OnInit {
  section = '';
  title = '';
  description = '';
  sectionKey = '';
  userSummary: AdminUsersSummary = {
    totalUsuarios: 0,
    administradores: 0,
    participantes: 0,
    compradores: 0,
    ganadores: 0,
    nuevosHoy: 0,
    ticketsTotales: 0
  };
  userStats = this.buildUserStats(this.userSummary);
  systemUsers: AdminSystemUserItem[] = [];
  buyers: AdminBuyerItem[] = [];
  winners: AdminWinnerItem[] = [];
  selectedUserView: 'sistema' | 'compradores' | 'ganadores' = 'sistema';
  paymentSummary = [
    {
      label: 'Volumen total (24h)',
      value: '$45,280.00',
      detail: 'Basado en 842 transacciones',
      badge: '+12%',
      tone: 'light'
    },
    {
      label: 'Pagos pendientes',
      value: '$12,450.00',
      detail: '14 solicitudes pendientes de revision',
      badge: 'Aprobacion Req.',
      tone: 'dark'
    },
    {
      label: 'Metodo predominante',
      value: 'Crypto Ledger',
      detail: '',
      badge: '',
      tone: 'soft'
    }
  ];
  payments: Array<{
    initials: string;
    name: string;
    id: string;
    date: string;
    time: string;
    amount: string;
    method: string;
    icon: string;
    status: string;
    email: string;
    raffleTitle: string;
    quantity: string;
    statusKey: 'all' | 'success' | 'pending';
  }> = [];
  paymentSummaryData: AdminPaymentsSummary = {
    volumen24h: 0,
    transacciones24h: 0,
    pagosPendientes: 0,
    solicitudesPendientes: 0,
    metodoPredominante: 'Flow',
    totalResultados: 0
  };
  traceStats: TraceabilityStat[] = [
    { label: 'Eventos hoy', value: '0', detail: 'Sin eventos registrados' },
    { label: 'Alertas criticas', value: '0', detail: 'Sin alertas pendientes' },
    { label: 'Estado de la integridad', value: 'Validado', detail: 'Sin inconsistencias detectadas' }
  ];
  timelineEntries: TraceabilityTimelineEntry[] = [];
  activeUsers: TraceabilityActiveUser[] = [];
  traceSynced = false;
  traceGeneratedAt?: string;
  traceShowAll = false;
  forensicReport: TraceabilityForensicReport = {
    title: 'Analisis forense de datos',
    description: 'Sin datos disponibles para ejecutar el analisis.',
    actionLabel: 'Actualizar analisis'
  };
  usersTotalLabel = '0';
  paymentsTotalLabel = '0';
  selectedPaymentFilter: 'all' | 'success' | 'pending' = 'all';
  paymentPage = 1;
  readonly paymentPageSize = 10;
  selectedTraceFilter = 'Todos';
  readonly traceFilters = ['Todos', 'Ventas', 'Admin', 'Usuarios'];

  constructor(
    private route: ActivatedRoute,
    private adminUsersService: AdminUsersService,
    private adminPaymentsService: AdminPaymentsService,
    private adminTraceabilityService: AdminTraceabilityService
  ) {}

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.section = data['section'] ?? '';
    this.title = data['title'] ?? '';
    this.description = data['description'] ?? '';
    this.sectionKey = this.section.toLowerCase();

    if (this.sectionKey === 'trazabilidad') {
      this.loadTraceability();
    }

    if (this.sectionKey === 'usuarios') {
      this.loadUsers();
    }

    if (this.sectionKey === 'pagos') {
      this.loadPayments();
    }
  }

  getStatusClass(value: string): string {
    const normalized = value.toLowerCase();

    if (
      normalized.includes('activo') ||
      normalized.includes('completado') ||
      normalized.includes('online')
    ) {
      return 'positive';
    }

    if (
      normalized.includes('baneado') ||
      normalized.includes('rechazado') ||
      normalized.includes('error') ||
      normalized.includes('alto')
    ) {
      return 'danger';
    }

    if (normalized.includes('pendiente')) {
      return 'warning';
    }

    return 'neutral';
  }

  get filteredTimelineEntries(): TraceabilityTimelineEntry[] {
    const filtered = this.selectedTraceFilter === 'Todos'
      ? this.timelineEntries
      : this.timelineEntries.filter(
      entry => entry.category.toLowerCase() === this.selectedTraceFilter.toLowerCase()
      );

    return this.traceShowAll ? filtered : filtered.slice(0, 12);
  }

  setTraceFilter(filter: string): void {
    this.selectedTraceFilter = filter;
    this.traceShowAll = false;
  }

  private loadUsers(): void {
    this.adminUsersService.getUsers().subscribe({
      next: response => {
        this.userSummary = response.summary;
        this.userStats = this.buildUserStats(response.summary);
        this.usersTotalLabel = this.formatCount(response.summary.totalUsuarios);
        this.systemUsers = response.systemUsers;
        this.buyers = response.buyers;
        this.winners = response.winners;
      },
      error: () => {
        this.userStats = this.buildUserStats(this.userSummary);
        this.usersTotalLabel = this.formatCount(this.systemUsers.length);
      }
    });
  }

  private loadPayments(): void {
    this.adminPaymentsService.getPayments().subscribe({
      next: response => {
        this.paymentSummaryData = response.summary;
        this.paymentSummary = this.buildPaymentStats(response.summary);
        this.payments = response.items.map(payment => this.mapPaymentRow(payment));
        this.paymentsTotalLabel = this.formatCount(response.summary.totalResultados);
        this.paymentPage = 1;
      },
      error: () => {
        this.paymentSummary = this.buildPaymentStats(this.paymentSummaryData);
        this.paymentsTotalLabel = this.formatCount(this.payments.length);
      }
    });
  }

  private loadTraceability(): void {
    this.adminTraceabilityService.getSummary().subscribe({
      next: response => {
        this.traceStats = response.stats;
        this.timelineEntries = response.timeline;
        this.activeUsers = response.activeUsers;
        this.traceSynced = response.synced;
        this.traceGeneratedAt = response.generatedAt;
        this.forensicReport = response.forensicReport;
      },
      error: () => {
        this.traceStats = [
          { label: 'Eventos hoy', value: '0', detail: 'Sin eventos registrados' },
          { label: 'Alertas criticas', value: '0', detail: 'Sin alertas pendientes' },
          { label: 'Estado de la integridad', value: 'Validado', detail: 'No se pudo sincronizar el backend' }
        ];
        this.timelineEntries = [];
        this.activeUsers = [];
        this.traceSynced = false;
        this.traceGeneratedAt = undefined;
        this.forensicReport = {
          title: 'Analisis forense de datos',
          description: 'No se pudo obtener el analisis desde el backend.',
          actionLabel: 'Reintentar'
        };
      }
    });
  }

  private buildUserStats(summary: AdminUsersSummary) {
    return [
      {
        label: 'Administradores',
        value: this.formatCount(summary.administradores),
        badge: 'Acceso total',
        tone: 'secondary'
      },
      {
        label: 'Compradores',
        value: this.formatCount(summary.compradores),
        badge: 'Compraron tickets',
        tone: 'surface'
      },
      {
        label: 'Ganadores',
        value: this.formatCount(summary.ganadores),
        badge: 'Rifas finalizadas',
        tone: 'light'
      },
      {
        label: 'Tickets totales',
        value: this.formatCount(summary.ticketsTotales),
        badge: 'Compras vinculadas',
        tone: 'primary'
      }
    ];
  }

  private buildPaymentStats(summary: AdminPaymentsSummary) {
    return [
      {
        label: 'Volumen total (24h)',
        value: this.formatCurrency(summary.volumen24h),
        detail: `Basado en ${this.formatCount(summary.transacciones24h)} transacciones`,
        badge: 'Actualizado',
        tone: 'light'
      },
      {
        label: 'Pagos pendientes',
        value: this.formatCurrency(summary.pagosPendientes),
        detail: `${this.formatCount(summary.solicitudesPendientes)} solicitudes pendientes`,
        badge: 'Revision',
        tone: 'dark'
      },
      {
        label: 'Metodo predominante',
        value: summary.metodoPredominante || 'Flow',
        detail: '',
        badge: '',
        tone: 'soft'
      }
    ];
  }

  private mapPaymentRow(payment: AdminPaymentItem) {
    return {
      initials: this.getInitials(payment.compradorNombre),
      name: payment.compradorNombre,
      id: payment.flowOrderId || payment.id.slice(-8).toUpperCase(),
      date: this.formatDate(payment.createdAt),
      time: this.formatTime(payment.createdAt),
      amount: this.formatCurrency(payment.montoTotal),
      method: payment.metodo,
      icon: this.getPaymentMethodIcon(payment.metodo),
      status: payment.estado,
      email: payment.compradorEmail,
      raffleTitle: payment.raffleTitulo,
      quantity: this.formatCount(payment.cantidadTickets),
      statusKey: payment.estado === 'Completado' ? 'success' as const : 'pending' as const
    };
  }

  getRelativeLabel(value?: string | null): string {
    if (!value) {
      return 'Sin actividad';
    }

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} dias`;
  }

  formatCount(value: number): string {
    return new Intl.NumberFormat('es-CL').format(value ?? 0);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  private formatTime(value?: string | null): string {
    if (!value) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(value));
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  setUserView(view: 'sistema' | 'compradores' | 'ganadores'): void {
    this.selectedUserView = view;
  }

  getUserViewCount(): string {
    if (this.selectedUserView === 'compradores') {
      return this.formatCount(this.buyers.length);
    }

    if (this.selectedUserView === 'ganadores') {
      return this.formatCount(this.winners.length);
    }

    return this.formatCount(this.systemUsers.length);
  }

  getSystemUserRoleLabel(role: 'ADMIN' | 'CLIENTE'): string {
    return role === 'ADMIN' ? 'Administrador' : 'Cliente';
  }

  getWinnerDateLabel(value?: string | null): string {
    return this.formatDate(value);
  }

  toggleTraceHistory(): void {
    this.traceShowAll = !this.traceShowAll;
  }

  refreshTraceability(): void {
    this.loadTraceability();
  }

  getTraceSyncLabel(): string {
    return this.traceSynced ? 'Sincronizado' : 'Sin conexion';
  }

  getTraceHistoryActionLabel(): string {
    return this.traceShowAll ? 'Ver menos' : 'Ver historico completo';
  }

  getTraceGeneratedAtLabel(): string {
    if (!this.traceGeneratedAt) {
      return 'Sin sincronizacion reciente';
    }

    return `${this.formatDate(this.traceGeneratedAt)} · ${this.formatTime(this.traceGeneratedAt)}`;
  }

  setPaymentFilter(filter: 'all' | 'success' | 'pending'): void {
    this.selectedPaymentFilter = filter;
    this.paymentPage = 1;
  }

  get filteredPayments() {
    if (this.selectedPaymentFilter === 'all') {
      return this.payments;
    }

    return this.payments.filter(payment => payment.statusKey === this.selectedPaymentFilter);
  }

  get paginatedPayments() {
    const start = (this.paymentPage - 1) * this.paymentPageSize;
    return this.filteredPayments.slice(start, start + this.paymentPageSize);
  }

  get paymentTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPayments.length / this.paymentPageSize));
  }

  getPaymentResultsLabel(): string {
    return this.formatCount(this.filteredPayments.length);
  }

  previousPaymentPage(): void {
    if (this.paymentPage > 1) {
      this.paymentPage -= 1;
    }
  }

  nextPaymentPage(): void {
    if (this.paymentPage < this.paymentTotalPages) {
      this.paymentPage += 1;
    }
  }

  exportPaymentsReport(): void {
    const rows = this.filteredPayments;
    if (!rows.length) {
      return;
    }

    const generatedAt = new Date();
    const headers = [
      'Titular',
      'Correo',
      'Fecha',
      'Hora',
      'Monto',
      'Metodo',
      'Estado',
      'Sorteo',
      'Cantidad Tickets',
      'Referencia'
    ];

    const bodyRows = rows.map(payment => [
      payment.name,
      payment.email,
      payment.date,
      payment.time,
      payment.amount,
      payment.method,
      payment.status,
      payment.raffleTitle,
      payment.quantity,
      payment.id
    ]);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table border="1">
            <tr><th colspan="${headers.length}">Reporte de Transacciones</th></tr>
            <tr><td colspan="${headers.length}">Generado: ${this.formatDateTimeForExport(generatedAt)}</td></tr>
            <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
            ${bodyRows
              .map(row => `<tr>${row.map(value => `<td>${this.escapeHtml(String(value ?? ''))}</td>`).join('')}</tr>`)
              .join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-transacciones-${this.buildExportDateStamp(generatedAt)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private getPaymentMethodIcon(method: string): string {
    const normalized = method.toLowerCase();

    if (normalized.includes('crypto') || normalized.includes('bitcoin')) {
      return 'currency_bitcoin';
    }

    if (normalized.includes('tarjeta') || normalized.includes('credito') || normalized.includes('card')) {
      return 'credit_card';
    }

    return 'account_balance';
  }

  private formatDateTimeForExport(value: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(value);
  }

  private buildExportDateStamp(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
