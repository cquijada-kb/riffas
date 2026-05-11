import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PublicRaffleCard } from '../../core/models';
import { RafflesService } from '../../core/raffles.service';

type SortMode = 'popular' | 'newest' | 'ending';
type CategoryKey = 'Vehiculos' | 'Relojes' | 'Tecnologia';

type ViewRaffle = PublicRaffleCard & {
  category: CategoryKey;
  summary: string;
  prizeLabel: string;
  endingLabel: string;
};

@Component({
  selector: 'app-raffles',
  templateUrl: './raffles.component.html',
  styleUrls: ['./raffles.component.css']
})
export class RafflesComponent implements OnInit {
  loading = true;
  sortMode: SortMode = 'popular';
  allRaffles: ViewRaffle[] = [];
  visibleRaffles: ViewRaffle[] = [];
  readonly activeStatusLabel = 'Activos';

  categoryFilters: Array<{ key: CategoryKey; label: string; checked: boolean }> = [
    { key: 'Vehiculos', label: 'Vehiculos', checked: true },
    { key: 'Relojes', label: 'Relojes', checked: true },
    { key: 'Tecnologia', label: 'Tecnologia', checked: true }
  ];

  constructor(private api: RafflesService, private router: Router) {}

  ngOnInit(): void {
    this.api.listActive().subscribe({
      next: (list) => {
        this.allRaffles = list.map((item, index) => this.toViewModel(item, index));
        this.applySort();
        this.loading = false;
      },
      error: () => {
        this.allRaffles = [];
        this.visibleRaffles = [];
        this.loading = false;
      }
    });
  }

  setSort(mode: SortMode): void {
    this.sortMode = mode;
    this.applySort();
  }

  toggleCategory(categoryKey: CategoryKey): void {
    const target = this.categoryFilters.find((item) => item.key === categoryKey);
    if (!target) {
      return;
    }

    const activeCount = this.categoryFilters.filter((item) => item.checked).length;
    if (target.checked && activeCount === 1) {
      return;
    }

    target.checked = !target.checked;
    this.applySort();
  }

  openRaffle(id: string): void {
    this.router.navigate(['/sorteos', id]);
  }

  trackById(_: number, raffle: ViewRaffle): string {
    return raffle.id;
  }

  get activeCategoryLabels(): CategoryKey[] {
    return this.categoryFilters.filter((item) => item.checked).map((item) => item.key);
  }

  private applySort(): void {
    const filtered = this.allRaffles.filter((item) => this.activeCategoryLabels.includes(item.category));
    const sorted = [...filtered];

    switch (this.sortMode) {
      case 'ending':
        sorted.sort((a, b) => this.getDateValue(a.closingAt) - this.getDateValue(b.closingAt));
        break;
      case 'newest':
        sorted.sort((a, b) => this.getDateValue(b.createdAt) - this.getDateValue(a.createdAt));
        break;
      case 'popular':
      default:
        sorted.sort((a, b) => b.vendidos - a.vendidos);
        break;
    }

    this.visibleRaffles = sorted;
  }

  private toViewModel(item: PublicRaffleCard, index: number): ViewRaffle {
    const category = this.resolveCategory(item.nombre, index);

    return {
      ...item,
      category,
      summary: this.resolveSummary(category),
      prizeLabel: this.formatPrize(item),
      endingLabel: this.resolveEnding(item)
    };
  }

  private resolveCategory(name: string, index: number): CategoryKey {
    const lower = name.toLowerCase();

    if (lower.includes('rolex') || lower.includes('watch') || lower.includes('reloj')) {
      return 'Relojes';
    }

    if (
      lower.includes('iphone') ||
      lower.includes('playstation') ||
      lower.includes('ps5') ||
      lower.includes('smart') ||
      lower.includes('tv') ||
      lower.includes('notebook') ||
      lower.includes('pc')
    ) {
      return 'Tecnologia';
    }

    if (
      lower.includes('auto') ||
      lower.includes('carro') ||
      lower.includes('tesla') ||
      lower.includes('porsche') ||
      lower.includes('bmw') ||
      lower.includes('moto')
    ) {
      return 'Vehiculos';
    }

    return (['Vehiculos', 'Relojes', 'Tecnologia'][index % 3] as CategoryKey);
  }

  private resolveSummary(category: CategoryKey): string {
    if (category === 'Vehiculos') {
      return 'Premios de alto impacto para quienes buscan potencia, diseno y presencia en una sola jugada.';
    }

    if (category === 'Relojes') {
      return 'Piezas de coleccion con diseno atemporal, presencia iconica y curaduria premium.';
    }

    return 'Tecnologia codiciada y experiencias digitales con acceso rapido, seguro y trazable.';
  }

  private formatPrize(item: PublicRaffleCard): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(item.precioNumero * item.totalNumeros);
  }

  private resolveEnding(item: PublicRaffleCard): string {
    if (item.closingAt) {
      const date = new Date(item.closingAt);
      if (!Number.isNaN(date.getTime())) {
        return `Cierra ${new Intl.DateTimeFormat('es-CL', {
          day: '2-digit',
          month: 'short'
        }).format(date)}`;
      }
    }

    if (item.progressPercent >= 90) {
      return 'Ultimos cupos';
    }

    if (item.progressPercent <= 20) {
      return 'Nuevo sorteo';
    }

    return `Avance ${item.progressPercent}%`;
  }

  private getDateValue(value?: string): number {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  }
}
