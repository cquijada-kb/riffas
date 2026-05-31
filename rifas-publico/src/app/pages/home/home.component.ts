import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { PublicRaffleCard } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

type SortBy = 'recent'|'sold'|'ending'|'priceAsc';

type Testimonial = {
  name: string;
  prize: string;
  quote: string;
  imageUrl: string;
  tilt: string;
};

@Component({
  selector:'app-home',
  templateUrl:'./home.component.html',
  styleUrls:['./home.component.css']
})
export class HomeComponent implements OnInit {
  loading = true;
  q = '';
  stickerEmail = '';
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  sortBy: SortBy = 'recent';
  raffles: PublicRaffleCard[] = [];
  filtered: PublicRaffleCard[] = [];

  heroMock = {
    label: 'Sorteo premium no. 042',
    titleTop: 'EL MITO',
    titleBottom: 'EN TUS MANOS.',
    copy: 'Participa por experiencias y premios reales con una puesta en escena premium, pago seguro y asignacion automatica de numeros.',
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80'
  };

  testimonials: Testimonial[] = [
    {
      name: 'Carlos M.',
      prize: 'Ganador Tesla Model S',
      quote: 'Nunca pense que un clic cambiaria tanto. La transparencia del proceso fue lo que me convencio.',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      tilt: 'tilt-a'
    },
    {
      name: 'Elena R.',
      prize: 'Ganadora Reloj Cartier',
      quote: 'La experiencia fue impecable de principio a fin. Se siente premium en cada paso.',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
      tilt: 'tilt-b'
    },
    {
      name: 'Jorge G.',
      prize: 'Ganador 10 ETH',
      quote: 'Rapido, serio y con premios que realmente valen la pena. Volveria a participar.',
      imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
      tilt: 'tilt-c'
    },
    {
      name: 'Lucia T.',
      prize: 'Ganadora Viaje Maldivas',
      quote: 'Todavia me cuesta creerlo. La plataforma transmite confianza y eso marca una gran diferencia.',
      imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=80',
      tilt: 'tilt-d'
    }
  ];

  trustSignals = [
    'Transaccion encriptada',
    'Sorteo certificado',
    'Soporte VIP 24/7'
  ];

  constructor(
    private api: RafflesService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
  ){}

  ngOnInit(){
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (token) {
      this.router.navigate(['/consultar-stickers'], {
        queryParams: { token },
        replaceUrl: true,
      });
      return;
    }

    this.load();
  }

  load(){
    this.loading = true;
    this.api.listActive().subscribe({
      next: (list) => {
        this.raffles = list;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.raffles = [];
        this.filtered = [];
        this.loading = false;
      }
    });
  }

  applyFilters(){
    let list = [...this.raffles];
    const query = this.q.trim().toLowerCase();

    if(query) {
      list = list.filter((item) => item.nombre.toLowerCase().includes(query));
    }

    switch(this.sortBy){
      case 'sold':
        list.sort((a, b) => b.vendidos - a.vendidos);
        break;
      case 'ending':
        list.sort((a, b) => b.progressPercent - a.progressPercent);
        break;
      case 'priceAsc':
        list.sort((a, b) => a.precioNumero - b.precioNumero);
        break;
      default:
        break;
    }

    this.filtered = list;
  }

  go(id:string){
    this.router.navigate(['/rifas', id]);
  }

  trackById(_: number, raffle: PublicRaffleCard) {
    return raffle.id;
  }

  get featuredRaffles(): PublicRaffleCard[] {
    return this.filtered.slice(0, 6);
  }

  get chronologicalRaffles(): PublicRaffleCard[] {
    return [...this.raffles];
  }

  scrollToListado(): void {
    const el = document.getElementById('catalogo');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  consultarStickers(): void {
    const email = this.stickerEmail.trim().toLowerCase();
    if (!this.emailPattern.test(email)) {
      this.toast.show('error', 'Correo no valido', 'Ingresa un correo con formato nombre@dominio.com.');
      return;
    }

    this.router.navigate(['/consultar-stickers'], {
      queryParams: { email }
    });
  }
}
