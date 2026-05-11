import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { PublicRaffleDetail } from '../../core/models';
import { RafflesService } from '../../core/raffles.service';
import { ToastService } from '../toast/toast.service';

type PurchaseResponse = {
  ok?: boolean;
  paymentUrl?: string;
  reserveId?: string;
  message?: string;
};

@Component({
  selector: 'app-purchase-modal',
  templateUrl: './purchase-modal.component.html',
  styleUrls: ['./purchase-modal.component.css'],
})
export class PurchaseModalComponent implements OnChanges {
  @Input() raffle!: PublicRaffleDetail;
  @Input() open = false;
  @Input() initialQuantity = 1;
  @Output() closed = new EventEmitter<void>();

  loading = false;

  form = this.fb.group({
    compradorNombre: ['', [Validators.required, Validators.minLength(3)]],
    compradorEmail: ['', [Validators.required, Validators.email]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private fb: FormBuilder,
    private raffles: RafflesService,
    private toast: ToastService,
  ) {}

  get compradorNombre() {
    return this.form.controls.compradorNombre;
  }
  get compradorEmail() {
    return this.form.controls.compradorEmail;
  }
  get cantidad() {
    return this.form.controls.cantidad;
  }

  maxAllowed(): number {
    const byLimit = this.raffle?.limiteMaximoPorPersona ?? 1;
    const byStock = this.raffle?.disponibles ?? 1;
    return Math.max(1, Math.min(byLimit, byStock));
  }

  inc(): void {
    const max = this.maxAllowed();
    const v = Number(this.cantidad.value || 1);
    if (v < max) this.cantidad.setValue(v + 1);
  }

  dec(): void {
    const v = Number(this.cantidad.value || 1);
    if (v > 1) this.cantidad.setValue(v - 1);
  }

  total(): number {
    const q = Number(this.cantidad.value || 1);
    return q * (this.raffle?.precioNumero ?? 0);
  }

  ngOnChanges(): void {
    const safe = Math.max(1, Math.min(this.initialQuantity || 1, this.maxAllowed()));
    this.cantidad.setValue(safe);
  }

  close(): void {
    this.loading = false;
    this.form.reset({ compradorNombre: '', compradorEmail: '', cantidad: 1 });
    this.closed.emit();
  }

  purchase(): void {
    if (!this.raffle) return;

    if (this.form.invalid) {
      this.toast.show('error', 'Datos incompletos', 'Ingresa nombre, correo y cantidad.');
      return;
    }

    const cantidad = Number(this.cantidad.value || 1);
    const max = this.maxAllowed();

    if (cantidad > max) {
      this.toast.show('error', 'Excede el maximo', `Maximo permitido: ${max}.`);
      this.cantidad.setValue(max);
      return;
    }

    const compradorNombre = String(this.compradorNombre.value || '').trim();
    const compradorEmail = String(this.compradorEmail.value || '').trim();

    if (!compradorNombre || !compradorEmail) {
      this.toast.show('error', 'Datos invalidos', 'Revisa nombre y correo.');
      return;
    }

    this.loading = true;

    this.raffles.purchase(this.raffle.id, cantidad, compradorNombre, compradorEmail).subscribe({
      next: (res: PurchaseResponse) => {
        this.loading = false;

        if (res?.paymentUrl) {
          window.location.href = res.paymentUrl;
          return;
        }

        this.toast.show(
          'success',
          'Compra creada',
          res?.message || 'Se creo la compra, pero falta URL de pago.',
        );
      },
      error: (err) => {
        this.loading = false;
        this.toast.show(
          'error',
          'No se pudo iniciar la compra',
          err?.error?.message || 'Intenta nuevamente.',
        );
      },
    });
  }
}
