import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Rifa } from '../../models/rifa.model';
import { RifasService } from '../../services/rifas.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';



@Component({
  selector: 'app-rifa-form-page',
  templateUrl: './rifa-form-page.component.html',
  styleUrls: ['./rifa-form-page.component.scss']
})
export class RifaFormPageComponent implements OnInit {
  isEdit = false;
  rifaId?: string;
  loading = false;

  // Solo declaramos, sin inicializar con this.fb aquí
  form!: FormGroup;

  cantidadesPreset = [100, 200, 500, 1000];
  imagenes: { file: File; preview: string }[] = [];

  imagenesExistentes: string[] = [];
  imagenesNuevas: { file: File; preview: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private rifasService: RifasService
  ) {
    // Inicializamos el form dentro del constructor
    this.form = this.fb.group({
      titulo: ['', [Validators.required]],
      descripcionPremio: ['', [Validators.required]],
      cantidadNumeros: [100, [Validators.required, Validators.min(1)]],
      precioPorNumero: [1000, [Validators.required, Validators.min(1)]],
      limitePorUsuario: [5, [Validators.required, Validators.min(1)]],
      fechaCierre: [null]
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          const id = params.get('id');
          if (!id) {
            return of(null);
          }
          this.isEdit = true;
          this.rifaId = id;
          this.loading = true;
          return this.rifasService.getRifaById(id);
        })
      )
      .subscribe((rifa: Rifa | null) => {
        if (rifa) {
          this.form.patchValue({
            titulo: rifa.titulo,
            descripcionPremio: rifa.descripcionPremio,
            cantidadNumeros: rifa.cantidadNumeros,
            precioPorNumero: rifa.precioPorNumero,
            limitePorUsuario: rifa.limitePorUsuario,
            fechaCierre: rifa.fechaCierre ? new Date(rifa.fechaCierre) : null
          });
          this.imagenesExistentes = (rifa as any).imagenes ?? [];
        }
        this.loading = false;
      });

  }

  submit(): void {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value as any;
    const formData = new FormData();

    formData.append('titulo', value.titulo);
formData.append('descripcion', value.descripcionPremio);
formData.append('totalTickets', String(value.cantidadNumeros));
formData.append('precioTicket', String(value.precioPorNumero));
formData.append('limitePorUsuario', String(value.limitePorUsuario));

    if (value.fechaCierre) {
      formData.append('fechaCierre', value.fechaCierre.toISOString());
    }

    for (const img of this.imagenesNuevas) {
  formData.append('imagenes', img.file);
}


    // 👇 imágenes
    this.imagenes.forEach((img, i) => {
      formData.append('imagenes', img.file);
    });

    const request$ =
  this.isEdit && this.rifaId
    ? this.rifasService.actualizarRifaFormData(this.rifaId, formData)
    : this.rifasService.crearRifaFormData(formData);

    request$.subscribe(() => {
      this.router.navigate(['/rifas']);
    });
  }


  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);

    for (const file of files) {
      if (this.imagenes.length >= 3) break;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagenes.push({
          file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removeImage(index: number): void {
    this.imagenes.splice(index, 1);
  }

  onNewImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    // REEMPLAZA: al seleccionar nuevas, se limpian previas nuevas
    this.imagenesNuevas = [];

    const files = Array.from(input.files).slice(0, 3);

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenesNuevas.push({
          file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removeNewImage(index: number): void {
    this.imagenesNuevas.splice(index, 1);
  }

}
