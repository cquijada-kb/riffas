import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../shared/material.module';
import { RifaListPageComponent } from './pages/rifa-list-page/rifa-list-page.component';
import { RifaFormPageComponent } from './pages/rifa-form-page/rifa-form-page.component';
import { RifaDetailPageComponent } from './pages/rifa-detail-page/rifa-detail-page.component';
import { RifaTicketsPageComponent } from './pages/rifa-tickets-page/rifa-tickets-page.component';

const routes: Routes = [
  {
    path: '',
    component: RifaListPageComponent
  },
  {
    path: 'nueva',
    component: RifaFormPageComponent
  },
  {
    path: 'editar/:id',
    component: RifaFormPageComponent
  },
  {
    path: ':id/tickets',
    component: RifaTicketsPageComponent
  },
  {
    path: ':id',
    component: RifaDetailPageComponent
  }
];

@NgModule({
  declarations: [
    RifaListPageComponent,
    RifaFormPageComponent,
    RifaDetailPageComponent,
    RifaTicketsPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class RifasModule {}
