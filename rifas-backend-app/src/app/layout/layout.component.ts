import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AdminPaymentsService } from '../admin/services/admin-payments.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  opened = true;
  currentUrl = '';

  readonly navigation = [
    { label: 'Panel principal', icon: 'dashboard', route: '/dashboard' },
    { label: 'Sorteos', icon: 'confirmation_number', route: '/rifas' },
    { label: 'Usuarios', icon: 'group', route: '/usuarios' },
    { label: 'Trazabilidad', icon: 'history_edu', route: '/trazabilidad' },
    { label: 'Pagos', icon: 'payments', route: '/pagos' }
  ];

  constructor(
    private router: Router,
    private adminPaymentsService: AdminPaymentsService,
    private authService: AuthService
  ) {
    this.currentUrl = this.router.url;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  get canDownloadReport(): boolean {
    return this.currentUrl.startsWith('/pagos');
  }

  downloadPaymentsReport(): void {
    if (!this.canDownloadReport) {
      this.router.navigate(['/pagos']);
      return;
    }

    this.adminPaymentsService.getPayments().subscribe({
      next: response => {
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

        const bodyRows = response.items.map(payment => [
          payment.compradorNombre,
          payment.compradorEmail,
          this.formatDate(payment.createdAt),
          this.formatTime(payment.createdAt),
          this.formatCurrency(payment.montoTotal),
          payment.metodo,
          payment.estado,
          payment.raffleTitulo,
          this.formatCount(payment.cantidadTickets),
          payment.flowOrderId || payment.id
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
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('es-CL').format(value ?? 0);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value ?? 0);
  }

  private formatDate(value?: string | null): string {
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
