import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isAdmin = computed(() => {
    const role = this.auth.user()?.role;
    return role === 'admin' || role === 'superadmin';
  });

  readonly form = this.fb.nonNullable.group({
    ppnRate: [11, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  constructor() {
    this.settingsService.load().subscribe({
      next: (data) => {
        this.form.patchValue({ ppnRate: data.ppnRate });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Gagal memuat pengaturan', 'Tutup', { duration: 4000 });
      },
    });
  }

  save(): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Hanya admin yang dapat mengubah pengaturan', 'Tutup', { duration: 4000 });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.settingsService.updatePpnRate(this.form.controls.ppnRate.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Tarif PPN disimpan', 'OK', { duration: 3000 });
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.snackBar.open(err.error?.message || 'Gagal menyimpan', 'Tutup', { duration: 5000 });
      },
    });
  }

  resetDefault(): void {
    const defaultRate = this.settingsService.settings().defaultPpnRate;
    this.form.patchValue({ ppnRate: defaultRate });
  }
}
