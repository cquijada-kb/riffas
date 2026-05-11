import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Rifa } from '../../models/rifa.model';
import { RifasService } from '../../services/rifas.service';

@Component({
  selector: 'app-rifa-detail-page',
  templateUrl: './rifa-detail-page.component.html',
  styleUrls: ['./rifa-detail-page.component.scss']
})
export class RifaDetailPageComponent implements OnInit {
  rifa?: Rifa;
  loading = false;

  ganador?: string; // texto para mostrar ganador si el endpoint devuelve algo
  ganadorDetalle?: any;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rifasService: RifasService,
    private snack: MatSnackBar
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') as string;
    this.loadRifa(id);
  }

  loadRifa(id: string): void {
    this.loading = true;
    this.rifasService.getRifaById(id).subscribe({
      next: (rifa) => {
        this.rifa = rifa;
        this.loading = false;
        this.loadGanador(id);
      },
      error: () => {
        this.loading = false;
        this.snack.open('No se pudo cargar la rifa', 'Cerrar', { duration: 2500 });
      }
    });
  }

  getPorcentaje(): number {
    if (!this.rifa?.cantidadNumeros) return 0;
    return Math.round((this.rifa.numerosVendidos / this.rifa.cantidadNumeros) * 100);
  }

  getPrimaryImage(): string | null {
    return this.rifa?.imagenes && this.rifa.imagenes.length > 0 ? this.rifa.imagenes[0] : null;
  }

  volver(): void {
    this.router.navigate(['/rifas']);
  }

  editar(): void {
    if (!this.rifa) return;
    this.router.navigate(['/rifas/editar', this.rifa.id]);
  }

  cerrarRifa(): void {
    if (!this.rifa) return;

    this.rifasService.cerrarRifa(this.rifa.id).subscribe({
      next: (updated) => {
        this.rifa = updated;
        this.snack.open('Rifa cerrada', 'OK', { duration: 2000 });
      },
      error: (e) => {
        console.log(e)
        this.snack.open('No se pudo cerrar la rifa', 'Cerrar', { duration: 2500 });
      }
    });
  }

  sortear(): void {
    try {
      if (!this.rifa) return;

    const id = this.rifa.id;

    this.rifasService.ejecutarSorteo(id).subscribe({
      next: (res) => {
        this.ganador = res?.ganador ?? 'Sorteo ejecutado';
        this.snack.open('Sorteo ejecutado', 'OK', { duration: 2000 });

        this.loadRifa(id);
        this.loadGanador(id); // ✅ traer detalle del ganador
      },
      error: (e) => {
        console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaa', e.message)
        this.snack.open(e.message, 'Cerrar', { duration: 2500 });
      }
    });
    } catch (error) {
      console.log("🚀 ~ RifaDetailPageComponent ~ sortear ~ error:", error)
    }
    
  }


  puedeEditar(): boolean {
    return !!this.rifa && this.rifa.estado === 'ABIERTA';
  }

  puedeCerrar(): boolean {
    return !!this.rifa && this.rifa.estado === 'ABIERTA';
  }

  puedeSortear(): boolean {
    return !!this.rifa && this.rifa.estado === 'CERRADA';
  }

  loadGanador(id: string): void {
    this.rifasService.getGanadorDetalle(id).subscribe({
      next: (res) => {
        this.ganadorDetalle = res?.hasWinner ? res : undefined;
      },
      error: () => {
        this.ganadorDetalle = undefined;
      }
    });
  }

  puedeReabrir(): boolean {
    console.log('---------------->>>', this.rifa)
  if (!this.rifa) return false;

  // Solo si está cerrada y no está finalizada
  if (this.rifa.estado !== 'CERRADA') return false;

  // La validación real la hace el backend.
  // Aquí solo mostramos el botón si tiene fechaSorteo y aún no llega.
  // (si no tienes fechaSorteo en el modelo, lo dejamos solo por estado)
  return true;
}

reabrirRifa(): void {
  if (!this.rifa) return;
  const id = this.rifa.id;

  this.rifasService.abrirRifa(id).subscribe({
    next: (updated) => {
      this.rifa = updated;
      this.snack.open('Rifa reabierta', 'OK', { duration: 2000 });
    },
    error: (err) => {
      this.snack.open(err?.error?.message ?? 'No se pudo reabrir', 'Cerrar', { duration: 2500 });
    }
  });
}

}
