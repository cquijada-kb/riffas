import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { PublicRaffleDetail } from '../../core/models';

@Component({
  selector: 'app-raffle-detail',
  templateUrl: './raffle-detail.component.html',
  styleUrls: ['./raffle-detail.component.css'],
})
export class RaffleDetailComponent implements OnInit {
  id = this.route.snapshot.paramMap.get('id') || '';
  loading = true;

  raffle?: PublicRaffleDetail;
  selectedImage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: RafflesService,
  ) {}

  ngOnInit(): void {
    if (!this.id) {
      this.router.navigate(['/']);
      return;
    }

    this.api.getById(this.id).subscribe({
      next: (r) => {
        this.raffle = r;
        this.selectedImage = r.images?.[0] || r.imageUrl || '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
    });
  }

  selectImage(img: string) {
    this.selectedImage = img;
  }

  volver() {
    this.router.navigate(['/']);
  }

  openPurchase() {
    // aquí llamas tu modal real
    alert('Abrir modal de compra');
  }
}
