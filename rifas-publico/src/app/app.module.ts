import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { HomeComponent } from './pages/home/home.component';
import { RafflesComponent } from './pages/raffles/raffles.component';
import { RaffleDetailComponent } from './pages/raffle-detail/raffle-detail.component';
import { FlowReturnComponent } from './pages/flow-return/flow-return.component';
import { PaymentResultComponent } from './pages/payment-result/payment-result.component';
import { WinnerComponent } from './pages/winner/winner.component';
import { TicketLookupComponent } from './pages/ticket-lookup/ticket-lookup.component';

import { PurchaseModalComponent } from './shared/purchase-modal/purchase-modal.component';
import { ToastComponent } from './shared/toast/toast.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    RafflesComponent,
    RaffleDetailComponent,
    FlowReturnComponent,
    PaymentResultComponent,
    WinnerComponent,
    TicketLookupComponent,
    PurchaseModalComponent,
    ToastComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
