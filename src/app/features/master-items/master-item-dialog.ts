import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { MasterItem } from '../../core/models/master-item.model';

export interface MasterItemDialogData {
  item: MasterItem;
}

@Component({
  selector: 'app-master-item-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Ubah Master Item</h2>
    <mat-dialog-content>
      <div class="item-meta">
        <div><span class="label">Kode</span> <code>{{ data.item.code }}</code></div>
        <div><span class="label">Kategori</span> {{ data.item.category }} · {{ data.item.version }}</div>
      </div>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nama item</mat-label>
          <input matInput formControlName="name" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>Nama wajib diisi</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Unit</mat-label>
          <input matInput formControlName="unit" />
          @if (form.controls.unit.touched && form.controls.unit.invalid) {
            <mat-error>Unit wajib diisi</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Std Size</mat-label>
          <input matInput formControlName="stdSize" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Batal</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        Simpan
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .item-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
      font-size: 13px;
      color: #8a8278;
    }

    .label {
      font-weight: 600;
      color: #5c564e;
      margin-right: 6px;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 400px);
    }
  `,
})
export class MasterItemDialogComponent {
  readonly data = inject<MasterItemDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MasterItemDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.item.name, Validators.required],
    unit: [this.data.item.unit, Validators.required],
    stdSize: [this.data.item.stdSize ?? ''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name,
      unit: raw.unit,
      stdSize: raw.stdSize || null,
    });
  }
}
