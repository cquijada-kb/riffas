import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RafflesService } from '../../core/raffles.service';
import { PaymentResult } from '../../core/models';
import { ToastService } from '../../shared/toast/toast.service';

@Component({ selector:'app-payment-result', templateUrl:'./payment-result.component.html', styleUrls:['./payment-result.component.css'] })
export class PaymentResultComponent implements OnInit {
  loading=true; result?: PaymentResult;
  constructor(private route: ActivatedRoute, private router: Router, private api: RafflesService, private toast: ToastService){}
  ngOnInit(){
    const flowOrderId = this.route.snapshot.queryParamMap.get('flowOrderId') || '';
    const status = (this.route.snapshot.queryParamMap.get('status') || '').toUpperCase() as 'PAID' | 'FAILED' | 'PENDING';

    if (!flowOrderId) {
      this.toast.show('error', 'Falta flowOrderId', 'No se puede validar el pago.');
      this.router.navigate(['/']);
      return;
    }

    this.api.getPaymentResult(flowOrderId, status || undefined).subscribe({
      next:(r)=>{ this.result=r; this.loading=false; },
      error:()=>{ this.loading=false; this.toast.show('error','No se pudo validar el pago','Intenta nuevamente.'); }
    });
  }
  goHome(){ this.router.navigate(['/']); }
  goRaffle(){ if(this.result) this.router.navigate(['/rifas', this.result.raffleId]); }
}
