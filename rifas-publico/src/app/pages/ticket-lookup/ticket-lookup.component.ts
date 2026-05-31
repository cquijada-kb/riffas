import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { TicketLookupResult } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-ticket-lookup',
  templateUrl: './ticket-lookup.component.html',
  styleUrls: ['./ticket-lookup.component.css'],
})
export class TicketLookupComponent implements OnInit {
  email = '';
  loading = false;
  verifying = false;
  requested = false;
  message = '';
  result?: TicketLookupResult;
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly raffles: RafflesService,
    private readonly toast: ToastService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (token) {
      this.verify(token);
      return;
    }

    const email = this.route.snapshot.queryParamMap.get('email')?.trim();
    if (email) {
      this.email = email;
      this.search();
    }
  }

  search(): void {
    if (this.loading) {
      return;
    }

    const email = this.email.trim().toLowerCase();
    if (!email) {
      this.toast.show('error', 'Correo requerido', 'Ingresa el correo usado en tu compra.');
      return;
    }

    if (!this.emailPattern.test(email)) {
      this.message = 'Ingresa un correo valido para enviar el link de verificacion.';
      this.toast.show('error', 'Correo no valido', this.message);
      return;
    }

    this.email = email;
    this.loading = true;
    this.requested = false;
    this.message = '';
    this.raffles.requestTicketLookup(email).subscribe({
      next: result => {
        this.result = undefined;
        this.requested = true;
        this.message = result.message;
        this.loading = false;
      },
      error: err => {
        this.result = undefined;
        this.requested = false;
        this.loading = false;
        this.message = err?.error?.message || 'No se pudo enviar el correo. Intenta nuevamente.';
        this.toast.show('error', 'No se pudo enviar el correo', this.message);
      }
    });
  }

  verify(token: string): void {
    this.verifying = true;
    this.raffles.lookupTicketsByToken(token).subscribe({
      next: result => {
        this.result = result;
        this.email = result.email;
        this.verifying = false;
      },
      error: err => {
        this.result = undefined;
        this.verifying = false;
        this.toast.show('error', 'Link no valido', err?.error?.message || 'Solicita un nuevo correo de verificacion.');
      }
    });
  }

  statusLabel(status: string): string {
    if (status === 'VENDIDO') return 'Pagado';
    if (status === 'POR_VERIFICAR') return 'Por verificar';
    return 'Disponible';
  }

  printPdf(): void {
    window.print();
  }

  ticketNumber(value: number): string {
    return String(value).padStart(4, '0');
  }
}
