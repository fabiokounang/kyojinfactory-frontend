import { Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PofService } from '../../core/services/pof.service';
import { AuthService } from '../../core/services/auth.service';
import {
  EligibleCustomerPo,
  Pof,
  PrefillData,
  UserAssignee,
} from '../../core/models/pof.model';

interface LineForm {
  customerPoLineId: FormControl<number>;
  productNumber: FormControl<string>;
  itemName: FormControl<string>;
  qtyToProduce: FormControl<number>;
  unit: FormControl<string>;
  bomVersionId: FormControl<number | null>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}

@Component({
  selector: 'app-prod-order-form-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './prod-order-form-form.html',
  styleUrl: './prod-order-form-form.scss',
})
export class ProdOrderFormFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pofService = inject(PofService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly eligiblePos = signal<EligibleCustomerPo[]>([]);
  readonly hasReadyPo = computed(() => this.eligiblePos().some((p) => p.isReady));
  readonly assignees = signal<UserAssignee[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.editingId() !== null);
  readonly prefill = signal<PrefillData | null>(null);

  readonly form = this.fb.nonNullable.group({
    customerPoId: [0, [Validators.required, Validators.min(1)]],
    supervisorUserId: [null as number | null],
    issuedByUserId: [null as number | null],
    notes: [''],
    lines: this.fb.array<FormGroup<LineForm>>([]),
  });

  get linesArray(): FormArray<FormGroup<LineForm>> {
    return this.form.controls.lines;
  }

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) this.editingId.set(Number(idParam));

    forkJoin({
      eligible: this.pofService.eligibleCustomerPos(),
      assignees: this.pofService.assignees(),
    }).subscribe({
      next: ({ eligible, assignees }) => {
        this.eligiblePos.set(eligible);
        this.assignees.set(assignees);

        if (this.isEditMode()) {
          this.pofService.get(this.editingId()!).subscribe({
            next: (pof) => this.patchForEdit(pof, eligible),
            error: () => {
              this.errorMessage.set('Gagal memuat data POF');
              this.loading.set(false);
            },
          });
        } else {
          // default issued_by = current user
          const me = this.auth.user();
          if (me) {
            const found = assignees.find((a) => a.id === (me as any).id);
            if (found) this.form.controls.issuedByUserId.setValue(found.id);
          }
          this.loading.set(false);
        }
      },
      error: () => {
        this.errorMessage.set('Gagal memuat data awal');
        this.loading.set(false);
      },
    });
  }

  private patchForEdit(pof: Pof, eligible: EligibleCustomerPo[]): void {
    // In edit mode, include current PO even if it already has a POF (it IS the one being edited)
    const alreadyInList = eligible.some((e) => e.id === pof.customerPoId);
    if (!alreadyInList) {
      this.eligiblePos.update((list) => [
        {
          id: pof.customerPoId,
          poNumber: pof.poNumber,
          poDate: '',
          customer: pof.customer,
          linesTotal: pof.lines.length,
          linesWithBom: pof.lines.filter((l) => l.bomVersionId).length,
          isReady: true,
        },
        ...list,
      ]);
    }

    this.form.patchValue({
      customerPoId: pof.customerPoId,
      supervisorUserId: pof.supervisorUserId,
      issuedByUserId: pof.issuedByUserId,
      notes: pof.notes ?? '',
    });
    this.form.controls.customerPoId.disable();

    this.linesArray.clear();
    for (const line of pof.lines) {
      this.linesArray.push(this.makeLine({
        customerPoLineId: line.customerPoLineId,
        productNumber: line.productNumber,
        itemName: line.itemName,
        qtyToProduce: line.qtyToProduce,
        unit: line.unit,
        bomVersionId: line.bomVersionId,
        startDate: line.startDate ?? '',
        endDate: line.endDate ?? '',
      }));
    }
    this.loading.set(false);
  }

  onPoChange(poId: number): void {
    if (!poId) return;
    const po = this.eligiblePos().find((p) => p.id === poId);
    if (po && !po.isReady) {
      this.form.controls.customerPoId.setValue(0);
      this.prefill.set(null);
      this.linesArray.clear();
      this.snackBar.open(
        `PO ${po.poNumber} belum siap: BOM ACTIVE ${po.linesWithBom}/${po.linesTotal} item. Selesaikan todo BOM dulu.`,
        'Tutup',
        { duration: 6000 }
      );
      return;
    }
    this.pofService.prefill(poId).subscribe({
      next: (data) => {
        this.prefill.set(data);
        this.linesArray.clear();
        for (const line of data.lines) {
          this.linesArray.push(this.makeLine({
            customerPoLineId: line.customerPoLineId,
            productNumber: line.productNumber,
            itemName: line.itemName,
            qtyToProduce: line.cpoQty,
            unit: line.unit,
            bomVersionId: line.bomVersionId,
            startDate: '',
            endDate: '',
          }));
        }
      },
      error: () => {
        this.snackBar.open('Gagal memuat data PO', 'Tutup', { duration: 4000 });
      },
    });
  }

  private makeLine(defaults: {
    customerPoLineId: number;
    productNumber: string;
    itemName: string;
    qtyToProduce: number;
    unit: string;
    bomVersionId: number | null;
    startDate: string;
    endDate: string;
  }): FormGroup<LineForm> {
    return this.fb.nonNullable.group<LineForm>({
      customerPoLineId: this.fb.nonNullable.control(defaults.customerPoLineId),
      productNumber: this.fb.nonNullable.control(defaults.productNumber),
      itemName: this.fb.nonNullable.control(defaults.itemName),
      qtyToProduce: this.fb.nonNullable.control(defaults.qtyToProduce, [Validators.required, Validators.min(0.0001)]),
      unit: this.fb.nonNullable.control(defaults.unit),
      bomVersionId: this.fb.control<number | null>(defaults.bomVersionId),
      startDate: this.fb.nonNullable.control(defaults.startDate, Validators.required),
      endDate: this.fb.nonNullable.control(defaults.endDate, Validators.required),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Periksa kembali form', 'Tutup', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const lines = this.linesArray.controls.map((g) => {
      const v = g.getRawValue();
      return {
        customerPoLineId: v.customerPoLineId,
        productNumber: v.productNumber,
        qtyToProduce: Number(v.qtyToProduce),
        unit: v.unit,
        bomVersionId: v.bomVersionId,
        startDate: v.startDate || null,
        endDate: v.endDate || null,
      };
    });

    const req$ = this.isEditMode()
      ? this.pofService.update(this.editingId()!, {
          supervisorUserId: raw.supervisorUserId,
          issuedByUserId: raw.issuedByUserId,
          notes: raw.notes || null,
          lines,
        })
      : this.pofService.create({
          customerPoId: raw.customerPoId,
          supervisorUserId: raw.supervisorUserId,
          issuedByUserId: raw.issuedByUserId,
          notes: raw.notes || null,
          lines,
        });

    req$.subscribe({
      next: (pof) => {
        this.snackBar.open('POF berhasil disimpan', 'OK', { duration: 3000 });
        this.router.navigate(['/prod-order-forms', pof.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.error?.message || 'Gagal menyimpan POF');
        this.saving.set(false);
      },
    });
  }
}
