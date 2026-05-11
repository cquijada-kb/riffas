import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { WinnerInfo } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({ selector:'app-winner', templateUrl:'./winner.component.html', styleUrls:['./winner.component.css'] })
export class WinnerComponent implements OnInit {
  loading=true; winner?: WinnerInfo;
  constructor(private route: ActivatedRoute, private router: Router, private api: RafflesService, private toast: ToastService){}
  ngOnInit(){
    const id=this.route.snapshot.paramMap.get('id')||'';
    this.api.getWinner(id).subscribe({
      next:(w)=>{ this.winner=w; this.loading=false; },
      error:()=>{ this.loading=false; this.toast.show('error','Sin ganador disponible','Aun no se publica el resultado.'); this.router.navigate(['/']); }
    });
  }
  goHome(){ this.router.navigate(['/']); }
  goRaffle(){ if(this.winner) this.router.navigate(['/rifas', this.winner.raffleId]); }
}
