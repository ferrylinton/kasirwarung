export type DatePreset = 'today' | 'week' | 'month' | '3months' | 'custom';

export function formatDate(date?: string | Date | number | null, options?: Intl.DateTimeFormatOptions, lang: string = 'id-ID'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const locale = lang.startsWith('en') ? 'en-US' : 'id-ID';
  return d.toLocaleDateString(locale, options || {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date?: string | Date | number | null, lang: string = 'id-ID'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const locale = lang.startsWith('en') ? 'en-US' : 'id-ID';
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date?: string | Date | number | null, lang: string = 'id-ID'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const locale = lang.startsWith('en') ? 'en-US' : 'id-ID';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date?: string | Date | number | null, lang: string = 'id'): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const isEn = lang.startsWith('en');
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return isEn ? `${Math.max(1, diffSec)}s ago` : `${Math.max(1, diffSec)} detik lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isEn ? `${diffMin}m ago` : `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isEn ? `${diffHour}h ago` : `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return isEn ? `${diffDay}d ago` : `${diffDay} hari lalu`;
  return formatDate(d, undefined, lang);
}

export function getDateRangeForPreset(preset: DatePreset, customVal?: any): { startDate: string; endDate: string } {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (preset === '3months') {
    start = new Date(now);
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'custom') {
    if (customVal instanceof Date) {
      start = new Date(customVal);
      start.setHours(0, 0, 0, 0);
      end = new Date(customVal);
      end.setHours(23, 59, 59, 999);
    } else if (Array.isArray(customVal) && customVal[0]) {
      start = new Date(customVal[0]);
      start.setHours(0, 0, 0, 0);
      end = customVal[1] ? new Date(customVal[1]) : new Date(customVal[0]);
      end.setHours(23, 59, 59, 999);
    }
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}
