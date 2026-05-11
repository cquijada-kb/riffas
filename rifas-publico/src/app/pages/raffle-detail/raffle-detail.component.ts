import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { PublicRaffleDetail } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({ selector: 'app-raffle-detail', templateUrl: './raffle-detail.component.html', styleUrls: ['./raffle-detail.component.css'] })
export class RaffleDetailComponent implements OnInit {
  loading = true;
  raffle?: PublicRaffleDetail;
  openBuy = false;
  selectedImage = '';
  selectedQuantity = 1;
  trustItems = [
    {
      title: 'Certificación del sorteo',
      copy: 'El proceso de compra y la asignación de números están integrados con la plataforma para garantizar trazabilidad y transparencia.'
    },
    {
      title: 'Pago seguro',
      copy: 'El cobro se procesa de forma segura y el participante recibe confirmación según el estado final del pago.'
    },
    {
      title: 'Asignación automática',
      copy: 'Los números disponibles se asignan automáticamente después de la compra para asegurar igualdad de condiciones entre participantes.'
    }
  ];
  rules = [
    'La cantidad maxima por persona depende de la configuracion actual de la rifa.',
    'Los numeros se asignan automaticamente al confirmar la compra.',
    'Si la rifa finaliza, el flujo cambia a visualizacion de ganador.',
    'Las compras solo estan disponibles cuando la rifa se encuentra activa.'
  ];

  constructor(private route: ActivatedRoute, private router: Router, private api: RafflesService, private toast: ToastService) { }

  setSelectedImage(url?: string) {
    if (url) this.selectedImage = url;
  }

  setQuantity(quantity: number) {
    const max = this.maxAllowed;
    const safe = Math.max(1, Math.min(Number(quantity) || 1, max));
    this.selectedQuantity = safe;
  }

  incQuantity(): void {
    this.setQuantity(this.selectedQuantity + 1);
  }

  decQuantity(): void {
    this.setQuantity(this.selectedQuantity - 1);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.api.getById(id).subscribe({
      next: (r) => {
        this.raffle = r;
        this.selectedImage = r.images?.[0] || r.imageUrl || '';
        this.selectedQuantity = 1;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buy() {
    if (!this.raffle) return;
    if (this.raffle.status === 'FINALIZADA') {
      this.router.navigate(['/sorteos', this.raffle.id, 'ganador']);
      return;
    }
    if (this.raffle.agotada || this.raffle.status !== 'ACTIVA') {
      this.toast.show('info', 'Rifa no disponible', 'Esta rifa no admite compras.');
      return;
    }
    this.openBuy = true;
  }

  get quantityLabel(): string {
    return `${this.selectedQuantity} boleto${this.selectedQuantity === 1 ? '' : 's'}`;
  }

  get maxAllowed(): number {
    if (!this.raffle) return 1;
    return Math.max(1, Math.min(this.raffle.limiteMaximoPorPersona, this.raffle.disponibles));
  }

  get urgencyLabel(): string {
    if (!this.raffle) return 'Disponible ahora';
    if (this.raffle.progressPercent >= 90) return 'Ultimos cupos';
    if (this.raffle.progressPercent >= 70) return 'Alta demanda';
    return 'Disponible ahora';
  }

  get countDown(): { value: string; label: string }[] {
    if (!this.raffle?.drawAt) {
      return [
        { value: '--', label: 'Dias' },
        { value: '--', label: 'Horas' },
        { value: '--', label: 'Min' }
      ];
    }

    const target = new Date(this.raffle.drawAt).getTime();
    const diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    return [
      { value: String(days).padStart(2, '0'), label: 'Dias' },
      { value: String(hours).padStart(2, '0'), label: 'Horas' },
      { value: String(minutes).padStart(2, '0'), label: 'Min' }
    ];
  }

  onImgError(ev: Event) {
    const el = ev.target as HTMLImageElement;
    console.log('Error cargando imagen:', el.src);
  }
}
