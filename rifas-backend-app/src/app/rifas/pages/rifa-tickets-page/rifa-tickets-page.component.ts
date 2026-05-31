import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RifasService, RaffleTicketsResponse } from '../../services/rifas.service';

type TicketStatusFilter = 'TODOS' | 'VENDIDO' | 'POR_VERIFICAR' | 'DISPONIBLE';

@Component({
  selector: 'app-rifa-tickets-page',
  templateUrl: './rifa-tickets-page.component.html',
  styleUrls: ['./rifa-tickets-page.component.scss']
})
export class RifaTicketsPageComponent implements OnInit {
  loading = false;
  data?: RaffleTicketsResponse;
  selectedTicket?: RaffleTicketsResponse['items'][number];
  filter: TicketStatusFilter = 'TODOS';
  query = '';
  readonly filters: Array<{ label: string; value: TicketStatusFilter }> = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Vendidos', value: 'VENDIDO' },
    { label: 'Por verificar', value: 'POR_VERIFICAR' },
    { label: 'Disponibles', value: 'DISPONIBLE' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rifasService: RifasService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get items() {
    const text = this.query.toLowerCase().trim();
    const items = this.data?.items ?? [];
    if (!text) return items;

    return items.filter(item => {
      return [
        item.numero,
        item.compradorNombre,
        item.compradorEmail,
        item.compradorTelefono,
        item.compradorRut,
        item.compradorCiudad,
        item.estado
      ].some(value => String(value ?? '').toLowerCase().includes(text));
    });
  }

  selectTicket(item: RaffleTicketsResponse['items'][number]): void {
    this.selectedTicket = item;
  }

  ticketNumber(value: number): string {
    const total = this.data?.raffle.totalTickets ?? 9999;
    const size = Math.max(4, String(total).length);
    return String(value).padStart(size, '0');
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;
    this.rifasService.getTicketsByRifa(id, this.filter).subscribe({
      next: response => {
        this.data = response;
        this.selectedTicket = undefined;
        this.loading = false;
      },
      error: () => {
        this.data = undefined;
        this.selectedTicket = undefined;
        this.loading = false;
      }
    });
  }

  setFilter(value: TicketStatusFilter): void {
    this.filter = value;
    this.load();
  }

  volver(): void {
    this.router.navigate(['/rifas']);
  }

  statusLabel(status: string): string {
    if (status === 'VENDIDO') return 'Vendido';
    if (status === 'POR_VERIFICAR') return 'Por verificar';
    return 'Disponible';
  }

  exportExcel(): void {
    const generatedAt = new Date();
    const rows = [
      ['Ticket', 'Comprador', 'RUT', 'Correo', 'Telefono', 'Ciudad', 'Estado', 'Flow Order', 'Referencia'],
      ...this.items.map(item => [
        this.ticketNumber(item.numero),
        item.compradorNombre,
        item.compradorRut,
        item.compradorEmail,
        item.compradorTelefono,
        item.compradorCiudad,
        this.statusLabel(item.estado),
        item.flowOrderId ?? '',
        item.referenciaPago ?? ''
      ])
    ];

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            <tr><th colspan="${rows[0].length}">Tickets - ${this.escapeHtml(this.data?.raffle.titulo ?? 'Sorteo')}</th></tr>
            <tr><td colspan="${rows[0].length}">Generado: ${this.escapeHtml(this.formatDateTime(generatedAt))}</td></tr>
            ${rows.map(row => `<tr>${row.map(value => `<td>${this.escapeHtml(String(value ?? ''))}</td>`).join('')}</tr>`).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets-${this.data?.raffle.id ?? 'sorteo'}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printPdf(): void {
    window.print();
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(value);
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
