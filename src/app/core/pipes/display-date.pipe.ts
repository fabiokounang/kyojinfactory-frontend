import { Pipe, PipeTransform } from '@angular/core';
import { formatTableDate, formatTableDateTime } from '../utils/date.util';

export type DisplayDateMode = 'date' | 'datetime';

@Pipe({ name: 'displayDate', standalone: true })
export class DisplayDatePipe implements PipeTransform {
  transform(value: string | null | undefined, mode: DisplayDateMode = 'datetime'): string {
    if (!value) return '—';
    return mode === 'date' ? formatTableDate(value) : formatTableDateTime(value);
  }
}
