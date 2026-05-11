import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Rifa } from '../../models/rifa.model';
import { RifasService, RifasSummary } from '../../services/rifas.service';

type RifaFilter = 'Todos los estados' | 'Activos' | 'Cerradas' | 'Finalizados';
type ViewMode = 'grid' | 'compact';
type SortMode = 'createdAt' | 'closing' | 'sales';

@Component({
  selector: 'app-rifa-list-page',
  templateUrl: './rifa-list-page.component.html',
  styleUrls: ['./rifa-list-page.component.scss']
})
export class RifaListPageComponent implements OnInit {
  rifas: Rifa[] = [];
  loading = false;
  stats: Array<{ label: string; value: string; icon: string; tone: string }> = [];
  readonly filters: RifaFilter[] = ['Todos los estados', 'Activos', 'Cerradas', 'Finalizados'];
  readonly sortOptions: Array<{ label: string; value: SortMode }> = [
    { label: 'Fecha de creacion', value: 'createdAt' },
    { label: 'Fecha de cierre', value: 'closing' },
    { label: 'Progreso de ventas', value: 'sales' }
  ];
  selectedFilter: RifaFilter = 'Todos los estados';
  selectedSort: SortMode = 'createdAt';
  viewMode: ViewMode = 'grid';

  constructor(
    private rifasService: RifasService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRifas();
    this.loadSummary();
  }

  loadRifas(): void {
    this.loading = true;
    this.rifasService.getRifas().subscribe({
      next: rifas => {
        this.rifas = rifas ?? [];
        this.loading = false;
      },
      error: () => {
        this.rifas = [];
        this.loading = false;
        this.snack.open('No se pudieron cargar los sorteos', 'Cerrar', { duration: 2500 });
      }
    });
  }

  loadSummary(): void {
    this.rifasService.getRifasSummary().subscribe({
      next: summary => {
        this.stats = this.buildStats(summary);
      },
      error: () => {
        this.stats = this.buildSummaryFallbackStats();
      }
    });
  }

  get filteredRifas(): Rifa[] {
    const filtered = this.rifas.filter(rifa => {
      if (this.selectedFilter === 'Todos los estados') {
        return true;
      }

      const statusMap: Record<Exclude<RifaFilter, 'Todos los estados'>, Rifa['estado']> = {
        Activos: 'ABIERTA',
        Cerradas: 'CERRADA',
        Finalizados: 'FINALIZADA'
      };

      return rifa.estado === statusMap[this.selectedFilter as Exclude<RifaFilter, 'Todos los estados'>];
    });

    return [...filtered].sort((a, b) => this.compareRifas(a, b));
  }

  getPorcentaje(rifa: Rifa): number {
    if (!rifa.cantidadNumeros) {
      return 0;
    }

    return Math.round((rifa.numerosVendidos / rifa.cantidadNumeros) * 100);
  }

  getCardTone(rifa: Rifa): 'active' | 'draft' | 'finished' {
    if (rifa.estado === 'FINALIZADA') {
      return 'finished';
    }

    if (rifa.estado === 'CERRADA') {
      return 'draft';
    }

    return 'active';
  }

  getStatusLabel(rifa: Rifa): string {
    if (rifa.estado === 'ABIERTA') {
      return 'Activo';
    }

    if (rifa.estado === 'CERRADA') {
      return 'Cerrado';
    }

    return 'Finalizado';
  }

  getClosingLabel(rifa: Rifa): string {
    if (rifa.estado === 'FINALIZADA') {
      return rifa.fechaCierre || 'Finalizado';
    }

    if (rifa.estado === 'CERRADA') {
      return 'Tickets no generados';
    }

    return `Expira ${rifa.fechaCierre}`;
  }

  getPrimaryImage(rifa: Rifa): string | null {
    return rifa.imagenes && rifa.imagenes.length > 0 ? rifa.imagenes[0] : null;
  }

  setFilter(filter: string): void {
    this.selectedFilter = filter as RifaFilter;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  setSort(mode: SortMode): void {
    this.selectedSort = mode;
  }

  getSelectedSortLabel(): string {
    return this.sortOptions.find(option => option.value === this.selectedSort)?.label ?? 'Fecha de creacion';
  }

  nuevaRifa(): void {
    this.router.navigate(['/rifas/nueva']);
  }

  verDetalle(rifa: Rifa): void {
    this.router.navigate(['/rifas', rifa.id]);
  }

  editarRifa(rifa: Rifa): void {
    this.router.navigate(['/rifas/editar', rifa.id]);
  }

  cerrarRifa(rifa: Rifa): void {
    this.rifasService.cerrarRifa(rifa.id).subscribe({
      next: () => {
        this.loadRifas();
        this.loadSummary();
        this.snack.open('Sorteo cerrado', 'OK', { duration: 2000 });
      },
      error: () => {
        this.snack.open('No se pudo cerrar el sorteo', 'Cerrar', { duration: 2500 });
      }
    });
  }

  ejecutarSorteo(rifa: Rifa): void {
    this.rifasService.ejecutarSorteo(rifa.id).subscribe({
      next: () => {
        this.loadRifas();
        this.loadSummary();
        this.snack.open('Sorteo ejecutado y ganador generado', 'OK', { duration: 2500 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'No se pudo ejecutar el sorteo', 'Cerrar', { duration: 2500 });
      }
    });
  }

  reabrirRifa(rifa: Rifa): void {
    this.rifasService.abrirRifa(rifa.id).subscribe({
      next: () => {
        this.loadRifas();
        this.loadSummary();
        this.snack.open('Sorteo reabierto', 'OK', { duration: 2000 });
      },
      error: (err) => {
        this.snack.open(err?.error?.message ?? 'No se pudo reabrir el sorteo', 'Cerrar', { duration: 2500 });
      }
    });
  }

  getActionLabel(rifa: Rifa): string {
    if (rifa.estado === 'FINALIZADA') {
      return 'Ver resultados';
    }

    if (rifa.estado === 'CERRADA') {
      return 'Ver detalle';
    }

    return 'Gestionar';
  }

  getMetaLabel(rifa: Rifa): string {
    if (rifa.estado === 'FINALIZADA') {
      return 'Auditoria OK';
    }

    if (rifa.estado === 'CERRADA') {
      return `Actualizado ${this.getRelativeTime(rifa.updatedAt)}`;
    }

    return `${this.formatCurrency(rifa.precioPorNumero)} por ticket`;
  }

  isMetaSubtle(rifa: Rifa): boolean {
    return rifa.estado === 'CERRADA';
  }

  canEdit(rifa: Rifa): boolean {
    return rifa.estado !== 'FINALIZADA';
  }

  canClose(rifa: Rifa): boolean {
    return rifa.estado === 'ABIERTA';
  }

  canReopen(rifa: Rifa): boolean {
    return rifa.estado === 'CERRADA';
  }

  canDraw(rifa: Rifa): boolean {
    return rifa.estado === 'CERRADA';
  }

  private buildStats(summary: RifasSummary): Array<{ label: string; value: string; icon: string; tone: string }> {
    return [
      { label: 'Activos', value: this.formatCount(summary.activos), icon: 'bolt', tone: 'success' },
      { label: 'Ventas hoy', value: this.formatCurrency(summary.ventasHoy), icon: 'trending_up', tone: 'success' },
      { label: 'Tickets vendidos', value: this.formatCount(summary.ticketsVendidos), icon: 'confirmation_number', tone: 'primary' },
      { label: 'Cerradas', value: this.formatCount(summary.cerradas), icon: 'drafts', tone: 'muted' }
    ];
  }

  private buildSummaryFallbackStats(): Array<{ label: string; value: string; icon: string; tone: string }> {
    return [
      { label: 'Activos', value: '0', icon: 'bolt', tone: 'success' },
      { label: 'Ventas hoy', value: this.formatCurrency(0), icon: 'trending_up', tone: 'success' },
      { label: 'Tickets vendidos', value: '0', icon: 'confirmation_number', tone: 'primary' },
      { label: 'Cerradas', value: '0', icon: 'drafts', tone: 'muted' }
    ];
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('es-CL').format(value ?? 0);
  }

  private compareRifas(a: Rifa, b: Rifa): number {
    if (this.selectedSort === 'sales') {
      return this.getPorcentaje(b) - this.getPorcentaje(a);
    }

    if (this.selectedSort === 'closing') {
      return this.getSortableDateValue(a.fechaCierre) - this.getSortableDateValue(b.fechaCierre);
    }

    return this.getSortableDateValue(b.createdAt) - this.getSortableDateValue(a.createdAt);
  }

  private getSortableDateValue(value?: string): number {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
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
}
