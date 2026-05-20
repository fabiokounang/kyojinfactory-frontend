import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BomComponent } from '../../core/models/bom.model';

/** Label untuk komponen yang punya level berikutnya tapi belum ada sub-komponen */
export const BOM_PENDING_CHILD_LABEL = 'Belum ada sub-komponen';

@Component({
  selector: 'app-bom-tree',
  standalone: true,
  imports: [DecimalPipe, NgClass, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './bom-tree.html',
  styleUrl: './bom-tree.scss',
})
export class BomTreeComponent implements OnChanges {
  @Input() components: BomComponent[] = [];
  @Input() parentId: number | null = null;
  @Input() depth = 0;
  @Input() pendingIds: number[] | null = null;
  @Input() allowEdit = false;
  @Input() allowSelect = false;
  @Input() selectedId: number | null = null;

  @Output() editClick = new EventEmitter<BomComponent>();
  @Output() deleteClick = new EventEmitter<BomComponent>();
  @Output() selectClick = new EventEmitter<BomComponent>();

  /** id komponen → expanded (default: terbuka jika punya anak) */
  private readonly expandedOverrides = signal<Record<number, boolean>>({});

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['components']) {
      this.ensureNewParentsExpanded();
    }
  }

  children(): BomComponent[] {
    return this.components
      .filter((c) => c.parentComponentId === this.parentId)
      .sort((a, b) => a.runningNumber - b.runningNumber);
  }

  childCount(id: number): number {
    return this.components.filter((c) => c.parentComponentId === id).length;
  }

  hasChildren(id: number): boolean {
    return this.childCount(id) > 0;
  }

  isExpandable(id: number): boolean {
    return this.hasChildren(id);
  }

  isExpanded(id: number): boolean {
    const overrides = this.expandedOverrides();
    if (id in overrides) return overrides[id];
    return this.hasChildren(id);
  }

  toggleExpand(id: number, event: Event): void {
    event.stopPropagation();
    const next = !this.isExpanded(id);
    this.expandedOverrides.update((s) => ({ ...s, [id]: next }));
  }

  isPending(id: number): boolean {
    return !!this.pendingIds && this.pendingIds.includes(id);
  }

  isSelected(id: number): boolean {
    return this.selectedId === id;
  }

  onRowClick(node: BomComponent, event: Event): void {
    if (!this.allowSelect) return;
    event.stopPropagation();
    this.selectClick.emit(node);
  }

  private ensureNewParentsExpanded(): void {
    const overrides = { ...this.expandedOverrides() };
    let changed = false;
    for (const c of this.components) {
      if (this.hasChildren(c.id) && !(c.id in overrides)) {
        overrides[c.id] = true;
        changed = true;
      }
    }
    if (changed) this.expandedOverrides.set(overrides);
  }
}
