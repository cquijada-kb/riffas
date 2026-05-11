import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

type HomeRaffle = {
  id: string;
  nombre: string;
  imageUrl?: string;
  precioNumero: number;
  totalNumeros: number;
  vendidos: number;
  progressPercent: number;
  agotada: boolean;
  createdAt?: string; // ISO
  badge?: 'NUEVA' | 'POR TERMINAR' | 'AGOTADA';
};

@Component({
  selector: 'app-home-public',
  templateUrl: './home-public.component.html',
  styleUrls: ['./home-public.component.css'],
})
export class HomePublicComponent implements OnInit {
  loading = true;

  q = '';
  sortBy: 'recent' | 'sold' | 'ending' | 'priceAsc' = 'recent';
  statusFilter: 'all' | 'new' | 'ending' = 'all';

  raffles: HomeRaffle[] = [];
  filtered: HomeRaffle[] = [];

  fallbackImg = 'assets/placeholder-prize.jpg';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // TODO: reemplazar por tu servicio real
    this.mockLoad();
  }

  scrollToList() {
    document.getElementById('listado')?.scrollIntoView({ behavior: 'smooth' });
  }

  setStatus(v: 'all' | 'new' | 'ending') {
    this.statusFilter = v;
    this.applyFilters();
  }

  goToRaffle(id: string) {
    this.router.navigate(['/rifas', id]);
  }

  applyFilters() {
    let list = [...this.raffles];

    const query = this.q.trim().toLowerCase();
    if (query) list = list.filter(x => x.nombre.toLowerCase().includes(query));

    if (this.statusFilter === 'new') list = list.filter(x => x.badge === 'NUEVA');
    if (this.statusFilter === 'ending') list = list.filter(x => x.badge === 'POR TERMINAR');

    switch (this.sortBy) {
      case 'sold':
        list.sort((a, b) => b.vendidos - a.vendidos);
        break;
      case 'ending':
        // “por terminar” = mayor % vendido primero
        list.sort((a, b) => b.progressPercent - a.progressPercent);
        break;
      case 'priceAsc':
        list.sort((a, b) => a.precioNumero - b.precioNumero);
        break;
      default:
        // recent: si tienes createdAt; si no, lo dejas tal cual
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    this.filtered = list;
  }

  private mockLoad() {
    this.raffles = [
      {
        id: '1',
        nombre: 'PlayStation 5 + 2 Juegos',
        precioNumero: 2500,
        totalNumeros: 2000,
        vendidos: 980,
        progressPercent: 49,
        agotada: false,
        badge: 'NUEVA',
        createdAt: '2025-12-10T10:00:00Z',
      },
      {
        id: '2',
        nombre: 'iPhone (modelo a definir)',
        precioNumero: 5000,
        totalNumeros: 1000,
        vendidos: 930,
        progressPercent: 93,
        agotada: false,
        badge: 'POR TERMINAR',
        createdAt: '2025-12-01T10:00:00Z',
      },
    ];
    this.loading = false;
    this.applyFilters();
  }
}
