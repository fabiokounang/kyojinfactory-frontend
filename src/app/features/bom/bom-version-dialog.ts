import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { MasterItem } from '../../core/models/master-item.model';

export interface BomVersionDialogData {
  fgItems: MasterItem[];
  preselectedFgId: number | null;
}

@Component({
  selector: 'app-bom-version-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>BOM Baru</h2>
    <mat-dialog-content>
      <p class="dialog-hint">Pilih Finished Good. Jika sudah ada draft untuk FG ini, draft itu yang dibuka.</p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Finished Good</mat-label>
          <mat-select formControlName="fgId">
            <mat-option [value]="0" disabled>— Pilih FG —</mat-option>
            @for (fg of data.fgItems; track fg.id) {
              <mat-option [value]="fg.id">{{ fg.code }} · {{ fg.name }}</mat-option>
            }
          </mat-select>
          @if (form.controls.fgId.touched && form.controls.fgId.invalid) {
            <mat-error>FG wajib dipilih</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Batal</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        Lanjut isi komponen
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-hint {
      margin: 0 0 12px;
      font-size: 13px;
      color: #6f6960;
      line-height: 1.45;
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 400px);
      padding-top: 4px;
    }
    .full-width {
      width: 100%;
    }
  `,
})
export class BomVersionDialogComponent {
  readonly data = inject<BomVersionDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BomVersionDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    fgId: [this.data.preselectedFgId || 0, [Validators.required, Validators.min(1)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({ fgId: this.form.controls.fgId.value });
  }
}
