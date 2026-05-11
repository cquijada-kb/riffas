import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AdminPaymentsResponse,
  AdminPaymentsService
} from '../../../admin/services/admin-payments.service';
import { Rifa } from '../../../rifas/models/rifa.model';
import { RifasService, RifasSummary } from '../../../rifas/services/rifas.service';

type DashboardMetric = {
  label: string;
  value: string;
  trend: string;
  detail: string;
  icon: string;
  subtle?: boolean;
};

type DashboardRaffle = {
  title: string;
  id: string;
  sold: number;
  tickets: string;
  closing: string;
  urgency: string;
  status: string;
  statusTone: 'secondary' | 'tertiary' | 'error';
  image?: string | null;
};

type DashboardBar = {
  height: number;
  tone: 'variant' | 'primary' | 'secondary';
};

type DashboardWinner = {
  name: string;
  prize: string;
  time: string;
  tone: 'secondary' | 'tertiary';
};

type DashboardOperationalItem = {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'neutral';
};

type ChartRange = 'month' | 'week';

type PaymentChartItem = {
  montoTotal: number;
  createdAt?: string | null;
};

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit {
  metrics: DashboardMetric[] = [];
  salesBars: DashboardBar[] = [];
  winners: DashboardWinner[] = [];
  activeRaffles: DashboardRaffle[] = [];
  chartLabels: string[] = [];
  operationalStatus: DashboardOperationalItem[] = [];
  selectedChartRange: ChartRange = 'month';
  private paymentItems: PaymentChartItem[] = [];

  constructor(
    private rifasService: RifasService,
    private adminPaymentsService: AdminPaymentsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshChart();

    forkJoin({
      rifas: this.rifasService.getRifas(),
      summary: this.rifasService.getRifasSummary(),
      payments: this.adminPaymentsService.getPayments()
    }).subscribe({
      next: ({ rifas, summary, payments }) => {
        this.metrics = this.buildMetrics(summary, payments);
        this.paymentItems = payments.items;
        this.refreshChart();
        this.operationalStatus = this.buildOperationalStatus(summary, payments);
        this.activeRaffles = rifas
          .filter(rifa => rifa.estado === 'ABIERTA')
          .slice(0, 3)
          .map(rifa => this.toDashboardRaffle(rifa));

        this.loadRecentWinners(rifas);
      },
      error: () => {
        this.metrics = this.buildMetricsFallback();
        this.paymentItems = [];
        this.refreshChart();
        this.salesBars = this.buildEmptyBars();
        this.operationalStatus = this.buildOperationalStatusFallback();
        this.activeRaffles = [];
        this.winners = [];
      }
    });
  }

  private toDashboardRaffle(rifa: Rifa): DashboardRaffle {
    const sold = this.getSoldPercentage(rifa);
    const statusTone =
      rifa.estado === 'FINALIZADA' ? 'error' : rifa.estado === 'CERRADA' ? 'tertiary' : 'secondary';

    return {
      title: rifa.titulo,
      id: rifa.id,
      sold,
      tickets: `${rifa.numerosVendidos.toLocaleString()} / ${rifa.cantidadNumeros.toLocaleString()}`,
      closing: rifa.fechaCierre ? new Date(rifa.fechaCierre).toLocaleDateString('es-CL') : 'Sin fecha',
      urgency: sold >= 95 ? 'Sorteo Inminente' : sold >= 80 ? 'Termina pronto' : 'En seguimiento',
      status:
        rifa.estado === 'ABIERTA' ? 'En Curso' : rifa.estado === 'CERRADA' ? 'Nuevo' : 'Cerrando',
      statusTone,
      image: rifa.imagenes && rifa.imagenes.length > 0 ? rifa.imagenes[0] : null
    };
  }

  private getSoldPercentage(rifa: Rifa): number {
    if (!rifa.cantidadNumeros) {
      return 0;
    }

    return Math.round((rifa.numerosVendidos / rifa.cantidadNumeros) * 100);
  }

  goToAllRaffles(): void {
    this.router.navigate(['/rifas']);
  }

  goToRaffleDetail(raffleId: string): void {
    this.router.navigate(['/rifas', raffleId]);
  }

  goToRaffleEdit(raffleId: string): void {
    this.router.navigate(['/rifas/editar', raffleId]);
  }

  goToPayments(): void {
    this.router.navigate(['/pagos']);
  }

  setChartRange(range: ChartRange): void {
    if (this.selectedChartRange === range) {
      return;
    }

    this.selectedChartRange = range;
    this.refreshChart();
  }

  private buildMetrics(summary: RifasSummary, payments: AdminPaymentsResponse): DashboardMetric[] {
    const completedPayments = payments.items.filter(payment => payment.estado === 'Completado');
    const totalRevenue = completedPayments.reduce(
      (total, payment) => total + Number(payment.montoTotal ?? 0),
      0
    );
    const salesTodayCount = completedPayments.filter(payment => this.isSameDay(payment.createdAt)).length;

    return [
      {
        label: 'Ingresos Totales',
        value: this.formatCurrency(totalRevenue),
        trend: this.formatCurrency(payments.summary.volumen24h),
        detail: 'Ventas registradas hoy',
        icon: 'payments'
      },
      {
        label: 'Boletos Vendidos',
        value: summary.ticketsVendidos.toLocaleString('es-CL'),
        trend: `${salesTodayCount} hoy`,
        detail: 'En todas las rifas',
        icon: 'confirmation_number'
      },
      {
        label: 'Sorteos Activos',
        value: summary.activos.toLocaleString('es-CL'),
        trend: `/ ${summary.totalRifas.toLocaleString('es-CL')} en total`,
        detail: this.buildInactiveStatusDetail(summary),
        icon: 'timer',
        subtle: true
      }
    ];
  }

  private buildMetricsFallback(): DashboardMetric[] {
    return [
      {
        label: 'Ingresos Totales',
        value: this.formatCurrency(0),
        trend: this.formatCurrency(0),
        detail: 'Sin datos disponibles',
        icon: 'payments'
      },
      {
        label: 'Boletos Vendidos',
        value: '0',
        trend: '0 hoy',
        detail: 'Sin datos disponibles',
        icon: 'confirmation_number'
      },
      {
        label: 'Sorteos Activos',
        value: '0',
        trend: '/ 0 en total',
        detail: 'Sin sorteos inactivos',
        icon: 'timer',
        subtle: true
      }
    ];
  }

  private buildEmptyBars(): DashboardBar[] {
    const count = this.selectedChartRange === 'week' ? 7 : 4;

    return Array.from({ length: count }, (_, index) => ({
      height: 12,
      tone: index === 3 ? 'secondary' : index % 2 === 0 ? 'variant' : 'primary'
    }));
  }

  private buildOperationalStatus(
    summary: RifasSummary,
    payments: AdminPaymentsResponse
  ): DashboardOperationalItem[] {
    return [
      {
        label: 'Pagos pendientes',
        value: payments.summary.pagosPendientes > 0
          ? this.formatCurrency(payments.summary.pagosPendientes)
          : 'Sin pendientes',
        tone: payments.summary.pagosPendientes > 0 ? 'warning' : 'success'
      },
      {
        label: 'Solicitudes pendientes',
        value: payments.summary.solicitudesPendientes.toLocaleString('es-CL'),
        tone: payments.summary.solicitudesPendientes > 0 ? 'warning' : 'success'
      },
      {
        label: 'Rifas cerradas o sorteadas',
        value: (summary.cerradas + summary.finalizadas).toLocaleString('es-CL'),
        tone: summary.cerradas + summary.finalizadas > 0 ? 'neutral' : 'success'
      }
    ];
  }

  private buildOperationalStatusFallback(): DashboardOperationalItem[] {
    return [
      {
        label: 'Pagos pendientes',
        value: 'Sin datos',
        tone: 'neutral'
      },
      {
        label: 'Solicitudes pendientes',
        value: 'Sin datos',
        tone: 'neutral'
      },
      {
        label: 'Rifas cerradas o sorteadas',
        value: 'Sin datos',
        tone: 'neutral'
      }
    ];
  }

  private buildInactiveStatusDetail(summary: RifasSummary): string {
    const inactiveTotal =
      summary.borradores +
      summary.pausadas +
      summary.pendientesSorteo +
      summary.finalizadas;

    if (inactiveTotal === 0) {
      return 'Sin sorteos fuera de operacion';
    }

    const parts: string[] = [];

    if (summary.pendientesSorteo > 0) {
      parts.push(`${summary.pendientesSorteo.toLocaleString('es-CL')} pendientes de sorteo`);
    }

    if (summary.finalizadas > 0) {
      parts.push(`${summary.finalizadas.toLocaleString('es-CL')} finalizadas`);
    }

    if (summary.pausadas > 0) {
      parts.push(`${summary.pausadas.toLocaleString('es-CL')} pausadas`);
    }

    if (summary.borradores > 0) {
      parts.push(`${summary.borradores.toLocaleString('es-CL')} borrador`);
    }

    return `${inactiveTotal.toLocaleString('es-CL')} fuera de operacion${parts.length ? `: ${parts.join(', ')}` : ''}`;
  }

  private loadRecentWinners(rifas: Rifa[]): void {
    const finalizedRaffles = [...rifas]
      .filter(rifa => rifa.estado === 'FINALIZADA')
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
      .slice(0, 2);

    if (!finalizedRaffles.length) {
      this.winners = [];
      return;
    }

    forkJoin(
      finalizedRaffles.map((rifa, index) =>
        this.rifasService.getGanadorDetalle(rifa.id).pipe(
          map((winner: any) => {
            if (!winner?.hasWinner) {
              return null;
            }

            return {
              name: winner.nombre || 'Ganador confirmado',
              prize: `Premio: ${rifa.titulo}`,
              time: this.getRelativeTime(rifa.updatedAt ?? rifa.fechaCierre),
              tone: index % 2 === 0 ? 'tertiary' as const : 'secondary' as const
            };
          }),
          catchError(() => of(null))
        )
      )
    ).subscribe(results => {
      this.winners = results.filter((winner): winner is DashboardWinner => winner !== null);
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value);
  }

  private isSameDay(value?: string | null): boolean {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  private getRelativeTime(value?: string): string {
    if (!value) {
      return 'sin fecha';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'sin fecha';
    }

    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));

    if (diffHours < 24) {
      return `hace ${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  private refreshChart(): void {
    this.chartLabels = this.buildChartLabels(this.selectedChartRange);
    this.salesBars = this.buildSalesBars(this.paymentItems, this.selectedChartRange);
  }

  private buildSalesBars(payments: PaymentChartItem[], range: ChartRange): DashboardBar[] {
    const totals = range === 'week'
      ? this.buildDailyTotals(payments)
      : this.buildWeeklyTotals(payments);
    const max = Math.max(...totals, 0);

    return totals.map((total, index) => ({
      height: max > 0 ? Math.max(12, Math.round((total / max) * 100)) : 12,
      tone: range === 'week'
        ? index === totals.length - 1 ? 'secondary' : index % 2 === 0 ? 'variant' : 'primary'
        : index === 3 ? 'secondary' : index % 2 === 0 ? 'variant' : 'primary'
    }));
  }

  private buildWeeklyTotals(payments: PaymentChartItem[]): number[] {
    const weeklyTotals = [0, 0, 0, 0];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 27);
    startDate.setHours(0, 0, 0, 0);

    payments.forEach(payment => {
      if (!payment.createdAt) {
        return;
      }

      const createdAt = new Date(payment.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < startDate || createdAt > now) {
        return;
      }

      const diffDays = Math.floor((createdAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.max(0, Math.floor(diffDays / 7)));
      weeklyTotals[weekIndex] += Number(payment.montoTotal ?? 0);
    });

    return weeklyTotals;
  }

  private buildDailyTotals(payments: PaymentChartItem[]): number[] {
    const dailyTotals = Array.from({ length: 7 }, () => 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    payments.forEach(payment => {
      if (!payment.createdAt) {
        return;
      }

      const createdAt = new Date(payment.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < startDate || createdAt > today) {
        return;
      }

      const diffDays = Math.floor((createdAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dayIndex = Math.min(6, Math.max(0, diffDays));
      dailyTotals[dayIndex] += Number(payment.montoTotal ?? 0);
    });

    return dailyTotals;
  }

  private buildChartLabels(range: ChartRange): string[] {
    return range === 'week' ? this.buildDailyLabels() : this.buildWeeklyLabels();
  }

  private buildWeeklyLabels(): string[] {
    const labels: string[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 27);
    startDate.setHours(0, 0, 0, 0);

    for (let index = 0; index < 4; index++) {
      const rangeStart = new Date(startDate);
      rangeStart.setDate(startDate.getDate() + index * 7);

      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);

      labels.push(`${this.formatShortDate(rangeStart)} - ${this.formatShortDate(rangeEnd)}`);
    }

    return labels;
  }

  private buildDailyLabels(): string[] {
    const labels: string[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    for (let index = 0; index < 7; index++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      labels.push(this.formatShortDate(date));
    }

    return labels;
  }
}
