import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MaterialModule } from '../shared/material.module';
import { RifaListPageComponent } from './pages/rifa-list-page/rifa-list-page.component';
import { RifaFormPageComponent } from './pages/rifa-form-page/rifa-form-page.component';
import { RifaDetailPageComponent } from './pages/rifa-detail-page/rifa-detail-page.component';

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
    path: ':id',
    component: RifaDetailPageComponent
  }
];

@NgModule({
  declarations: [
    RifaListPageComponent,
    RifaFormPageComponent,
    RifaDetailPageComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule.forChild(routes)
  ]
})
export class RifasModule {}
