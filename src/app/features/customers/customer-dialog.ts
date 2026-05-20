import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { Customer } from '../../core/models/customer.model';

export interface CustomerDialogData {
  customer?: Customer;
}

@Component({
  selector: 'app-customer-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.customer ? 'Ubah Customer' : 'Customer Baru' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nama customer</mat-label>
          <input matInput formControlName="name" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <mat-error>Nama wajib diisi</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Kontak person</mat-label>
          <input matInput formControlName="contactPerson" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Telepon</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.controls.email.touched && form.controls.email.hasError('email')) {
            <mat-error>Format email tidak valid</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Alamat</mat-label>
          <textarea matInput rows="3" formControlName="address"></textarea>
        </mat-form-field>
        @if (data.customer) {
          <mat-checkbox formControlName="isActive">Customer aktif</mat-checkbox>
        }
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
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: min(100%, 400px);
      padding-top: 8px;
    }
  `,
})
export class CustomerDialogComponent {
  readonly data = inject<CustomerDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CustomerDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.customer?.name ?? '', Validators.required],
    contactPerson: [this.data.customer?.contactPerson ?? ''],
    phone: [this.data.customer?.phone ?? ''],
    email: [this.data.customer?.email ?? '', Validators.email],
    address: [this.data.customer?.address ?? ''],
    isActive: [this.data.customer?.isActive ?? true],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }
}
