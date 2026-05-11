import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PaymentsService } from './payments.service';

@Component({
  selector: 'app-payment-response',
  templateUrl: './payment-result.component.html',
})
export class PaymentResponseComponent implements OnInit {
  loading = true;
  status: 'PAID' | 'FAILED' | 'PENDING' = 'PENDING';
  message = '';

  constructor(
    private payments: PaymentsService,
  ) {}

  ngOnInit(): void {
    /**
     * ⚠️ IMPORTANTE
     * Angular NO recibe el body POST de Flow.
     * Por lo tanto, NO intentamos leer token aquí.
     *
     * El backend ya procesó el callback real.
     * Solo preguntamos estado final.
     */
    this.payments.getLastPaymentStatus().subscribe({
      next: (res) => {
        this.status = res.status;
        this.message = res.message;
        this.loading = false;
      },
      error: () => {
        this.status = 'FAILED';
        this.message = 'No se pudo verificar el pago';
        this.loading = false;
      },
    });
  }
}
