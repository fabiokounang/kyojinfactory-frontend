import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {

  FormArray,

  FormBuilder,

  FormControl,

  FormGroup,

  ReactiveFormsModule,

  Validators,

} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatInputModule } from '@angular/material/input';

import { MatChipsModule } from '@angular/material/chips';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatRadioModule } from '@angular/material/radio';



import { BomService } from '../../core/services/bom.service';

import {

  BomBulkInput,

  BomComponent,

  BomDetail,

  BomVersion,

} from '../../core/models/bom.model';

import { BomTreeComponent } from './bom-tree';



interface LineForm {

  componentName: FormControl<string>;

  componentCode: FormControl<string>;

  qtyPerParent: FormControl<number>;

  unit: FormControl<string>;

  size: FormControl<string>;

  wastePercent: FormControl<number>;

  status: FormControl<'BRANCH' | 'RAW'>;

}



interface PendingListItem {

  id: number;

  parentLevel: number;

  componentCode: string;

  componentName: string;

}



/** 'fg' = tambah komponen Level 1; number = id parent untuk tambah anak */

export type BomWorkTarget = 'fg' | number;



@Component({

  selector: 'app-bom-builder',

  standalone: true,

  imports: [

    RouterLink,

    ReactiveFormsModule,

    MatCardModule,

    MatButtonModule,

    MatIconModule,

    MatFormFieldModule,

    MatInputModule,

    MatChipsModule,

    MatProgressSpinnerModule,

    MatSnackBarModule,

    MatTooltipModule,

    MatRadioModule,

    BomTreeComponent,

  ],

  templateUrl: './bom-builder.html',

  styleUrl: './bom-builder.scss',

})

export class BomBuilderComponent {

  private readonly bomService = inject(BomService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder);

  private readonly snackBar = inject(MatSnackBar);



  readonly detail = signal<BomDetail | null>(null);

  readonly loading = signal(true);

  readonly busy = signal(false);



  readonly workTarget = signal<BomWorkTarget>('fg');



  readonly form = this.fb.nonNullable.group({

    lines: this.fb.array<FormGroup<LineForm>>([]),

  });

  /** Signal-based form validity — ensures button reactivity in Angular 17 signal templates. */
  readonly formInvalid = toSignal(
    this.form.statusChanges.pipe(
      startWith(this.form.status),
      map((s) => s === 'INVALID'),
    ),
    { initialValue: true },
  );

  get linesArray(): FormArray<FormGroup<LineForm>> {

    return this.form.controls.lines;

  }



  readonly isDraft = computed(() => this.detail()?.version.status === 'DRAFT');



  readonly version = computed<BomVersion | null>(() => this.detail()?.version ?? null);

  readonly components = computed<BomComponent[]>(() => this.detail()?.components ?? []);



  readonly pendingParentIds = computed<number[]>(() => {

    const pbl = this.detail()?.progress.pendingByLevel || {};

    const ids: number[] = [];

    for (const list of Object.values(pbl)) {

      for (const p of list) ids.push(p.id);

    }

    return ids;

  });



  readonly pendingItems = computed<PendingListItem[]>(() => {

    const pbl = this.detail()?.progress.pendingByLevel ?? {};

    const items: PendingListItem[] = [];

    for (const [levelKey, list] of Object.entries(pbl)) {

      const parentLevel = Number(levelKey);

      for (const p of list) {

        items.push({

          id: p.id,

          parentLevel,

          componentCode: p.componentCode,

          componentName: p.componentName,

        });

      }

    }

    return items.sort(

      (a, b) => a.parentLevel - b.parentLevel || a.componentCode.localeCompare(b.componentCode)

    );

  });



  readonly pendingCount = computed(() => this.pendingItems().length);



  readonly showTodoPanel = computed(

    () =>

      this.isDraft() &&

      !!this.detail() &&

      !this.detail()!.progress.completed &&

      this.pendingCount() > 0

  );



  readonly workParent = computed<BomComponent | null>(() => {

    const t = this.workTarget();

    if (t === 'fg') return null;

    return this.components().find((c) => c.id === t) || null;

  });



  readonly workLevel = computed(() => {

    const p = this.workParent();

    return p ? p.level + 1 : 1;

  });



  readonly selectedTreeId = computed<number | null>(() => {

    const t = this.workTarget();

    return t === 'fg' ? null : t;

  });



  readonly canEditWorkPanel = computed(() => {

    if (!this.isDraft()) return false;

    const t = this.workTarget();

    if (t === 'fg') return true;

    return this.workParent()?.hasNextLevel ?? false;

  });



  readonly breadcrumb = computed<BomComponent[]>(() => {

    const trail: BomComponent[] = [];

    let node = this.workParent();

    while (node) {

      trail.unshift(node);

      node = node.parentComponentId

        ? this.components().find((c) => c.id === node!.parentComponentId) || null

        : null;

    }

    return trail;

  });



  readonly l1Stats = computed(() => {

    const l1 = this.components().filter((c) => c.level === 1);

    const pending = this.pendingParentIds();

    const branch = l1.filter((c) => c.hasNextLevel);

    const branchPending = branch.filter((c) => pending.includes(c.id)).length;

    return {

      total: l1.length,

      branch: branch.length,

      branchComplete: branch.length - branchPending,

      branchPending,

    };

  });



  readonly progressLabel = computed<string>(() => {

    const detail = this.detail();

    if (!detail) return '';

    const progress = detail.progress;

    if (progress.completed) return 'Struktur BOM lengkap — siap diaktifkan';

    const l1 = this.l1Stats();

    if (l1.total === 0) return 'Mulai dengan menambah komponen di bawah Finished Good';

    if (this.pendingCount() > 0) {

      return `${this.pendingCount()} komponen masih perlu sub-komponen`;

    }

    if (l1.branchPending > 0) {

      return `${l1.branchPending} dari ${l1.branch} cabang Level 1 belum lengkap`;

    }

    return `${l1.total} komponen Level 1 · ${detail.components.length} total`;

  });



  readonly workPanelTitle = computed(() => {

    if (this.workTarget() === 'fg') return 'Tambah komponen di bawah FG';

    const p = this.workParent();

    return p ? `Tambah sub-komponen · ${p.componentName}` : 'Panel kerja';

  });



  readonly saveButtonLabel = computed(() => {

    if (this.workTarget() === 'fg') return 'Simpan ke FG';

    const p = this.workParent();

    return p ? `Simpan ke ${p.componentCode}` : 'Simpan';

  });



  constructor() {

    this.load();

  }



  load(): void {

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {

      this.router.navigate(['/bom']);

      return;

    }

    this.loading.set(true);

    this.bomService.getVersion(id).subscribe({

      next: (data) => {

        this.detail.set(data);

        this.initWorkTarget(data);

        this.loading.set(false);

      },

      error: () => {

        this.loading.set(false);

        this.snackBar.open('BOM tidak ditemukan', 'Tutup', { duration: 5000 });

        this.router.navigate(['/bom']);

      },

    });

  }



  private initWorkTarget(detail: BomDetail): void {

    const items = this.pendingItemsFromDetail(detail);

    if (detail.components.length === 0) {

      this.selectFg();

      return;

    }

    if (items.length > 0) {

      this.selectComponentById(items[0].id);

      return;

    }

    this.selectFg();

  }



  private pendingItemsFromDetail(detail: BomDetail): PendingListItem[] {

    const pbl = detail.progress.pendingByLevel ?? {};

    const items: PendingListItem[] = [];

    for (const [levelKey, list] of Object.entries(pbl)) {

      for (const p of list) {

        items.push({

          id: p.id,

          parentLevel: Number(levelKey),

          componentCode: p.componentCode,

          componentName: p.componentName,

        });

      }

    }

    return items;

  }



  resetForm(): void {

    this.linesArray.clear();

    this.addLine();

  }



  addLine(): void {

    this.linesArray.push(this.makeLine());

  }



  removeLine(i: number): void {

    if (this.linesArray.length <= 1) return;

    this.linesArray.removeAt(i);

  }



  private makeLine(): FormGroup<LineForm> {

    return this.fb.nonNullable.group<LineForm>({

      componentName: this.fb.nonNullable.control('', Validators.required),

      componentCode: this.fb.nonNullable.control('', Validators.required),

      qtyPerParent: this.fb.nonNullable.control(1, [Validators.required, Validators.min(0.0001)]),

      unit: this.fb.nonNullable.control('pcs', Validators.required),

      size: this.fb.nonNullable.control(''),

      wastePercent: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),

      status: this.fb.nonNullable.control('RAW' as 'BRANCH' | 'RAW', Validators.required),

    });

  }



  selectFg(): void {

    this.workTarget.set('fg');

    this.resetForm();

  }



  selectComponent(c: BomComponent): void {

    this.selectComponentById(c.id);

  }



  selectComponentById(id: number): void {

    this.workTarget.set(id);

    this.resetForm();

  }



  goToPending(item: PendingListItem): void {

    this.selectComponentById(item.id);

  }



  saveLines(): void {

    if (!this.detail() || !this.canEditWorkPanel()) return;

    if (this.linesArray.length === 0) {

      this.snackBar.open('Tambah minimal satu komponen', 'Tutup', { duration: 4000 });

      return;

    }

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.snackBar.open('Periksa kembali form', 'Tutup', { duration: 4000 });

      return;

    }



    const level = this.workLevel();

    const parentId = this.workTarget() === 'fg' ? null : (this.workTarget() as number);



    const input: BomBulkInput = {

      level,

      parentId,

      rows: this.linesArray.controls.map((g) => {

        const raw = g.getRawValue();

        return {

          componentName: raw.componentName.trim(),

          componentCode: raw.componentCode.trim(),

          qtyPerParent: Number(raw.qtyPerParent),

          unit: raw.unit.trim() || 'pcs',

          size: raw.size?.trim() || null,

          wastePercent: Number(raw.wastePercent) || 0,

          hasNextLevel: raw.status === 'BRANCH',

        };

      }),

    };



    this.busy.set(true);

    this.bomService.addComponents(this.detail()!.version.id, input).subscribe({

      next: (data) => {

        this.detail.set(data);

        this.busy.set(false);

        this.snackBar.open('Komponen tersimpan', 'OK', { duration: 3000 });

        this.advanceAfterSave(data);

      },

      error: (err: HttpErrorResponse) => {

        this.busy.set(false);

        this.snackBar.open(err.error?.message || 'Gagal menyimpan komponen', 'Tutup', {

          duration: 5000,

        });

      },

    });

  }



  private advanceAfterSave(detail: BomDetail): void {

    const items = this.pendingItemsFromDetail(detail);

    const current = this.workTarget();



    if (current !== 'fg') {

      const stillPending = items.some((i) => i.id === current);

      if (stillPending) {

        this.resetForm();

        return;

      }

    }



    if (items.length > 0) {

      this.selectComponentById(items[0].id);

      return;

    }



    if (current !== 'fg') {

      this.selectFg();

    } else {

      this.resetForm();

    }

  }



  deleteComponent(c: BomComponent): void {

    if (!confirm(`Hapus komponen "${c.componentName}" beserta semua anaknya?`)) return;

    this.busy.set(true);

    this.bomService.deleteComponent(c.id).subscribe({

      next: () => {

        this.busy.set(false);

        const wasTarget = this.workTarget() === c.id;

        this.load();

        if (wasTarget) this.selectFg();

      },

      error: (err: HttpErrorResponse) => {

        this.busy.set(false);

        this.snackBar.open(err.error?.message || 'Gagal menghapus', 'Tutup', {

          duration: 5000,

        });

      },

    });

  }



  activate(): void {

    if (!this.detail()) return;

    if (

      !confirm(

        'Aktifkan BOM ini? BOM aktif lain untuk FG yang sama akan diarsipkan dan todo BOM untuk FG ini ditandai selesai.'

      )

    ) {

      return;

    }

    this.busy.set(true);

    this.bomService.activateVersion(this.detail()!.version.id).subscribe({

      next: (res) => {

        this.busy.set(false);

        const msg = `BOM aktif · ${res.tasksClosed} todo ditutup`;

        this.snackBar.open(msg, 'OK', { duration: 4000 });

        this.load();

      },

      error: (err: HttpErrorResponse) => {

        this.busy.set(false);

        this.snackBar.open(err.error?.message || 'Gagal mengaktifkan', 'Tutup', {

          duration: 5000,

        });

      },

    });

  }



  archive(): void {

    if (!this.detail()) return;

    if (!confirm('Arsipkan BOM ini?')) return;

    this.bomService.archiveVersion(this.detail()!.version.id).subscribe({

      next: () => {

        this.snackBar.open('BOM diarsipkan', 'OK', { duration: 3000 });

        this.load();

      },

    });

  }

}


