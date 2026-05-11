import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RafflesComponent } from './pages/raffles/raffles.component';
import { RaffleDetailComponent } from './pages/raffle-detail/raffle-detail.component';
import { PaymentResultComponent } from './pages/payment-result/payment-result.component';
import { FlowReturnComponent } from './pages/flow-return/flow-return.component';
import { WinnerComponent } from './pages/winner/winner.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'sorteos', component: RafflesComponent },
  { path: 'sorteos/:id', component: RaffleDetailComponent },
  { path: 'rifas/:id', redirectTo: 'sorteos/:id', pathMatch: 'full' },
  { path: 'flow/retorno', component: FlowReturnComponent },
  { path: 'pago/resultado', component: PaymentResultComponent },
  { path: 'sorteos/:id/ganador', component: WinnerComponent },
  { path: 'rifas/:id/ganador', redirectTo: 'sorteos/:id/ganador', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
