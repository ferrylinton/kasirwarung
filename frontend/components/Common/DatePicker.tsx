import React from 'react';
import ReactDatePicker from 'react-date-picker';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X } from 'lucide-react';

export type ValuePiece = Date | null;
export type DatePickerValue = ValuePiece | [ValuePiece, ValuePiece];

export interface DatePickerProps {
  value: DatePickerValue;
  onChange: (value: DatePickerValue) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  format?: string;
  locale?: string;
  disabled?: boolean;
  clearIcon?: React.ReactNode | null;
  calendarIcon?: React.ReactNode | null;
  dayPlaceholder?: string;
  monthPlaceholder?: string;
  yearPlaceholder?: string;
  dayAriaLabel?: string;
  monthAriaLabel?: string;
  yearAriaLabel?: string;
  nativeInputAriaLabel?: string;
  clearAriaLabel?: string;
  calendarAriaLabel?: string;
  showLeadingZeros?: boolean;
  className?: string;
  containerClassName?: string;
  required?: boolean;
  name?: string;
  id?: string;
  autoFocus?: boolean;
  disableCalendar?: boolean;
  isOpen?: boolean;
  onCalendarOpen?: () => void;
  onCalendarClose?: () => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  format,
  locale,
  disabled = false,
  clearIcon,
  calendarIcon,
  dayPlaceholder = 'dd',
  monthPlaceholder = 'mm',
  yearPlaceholder = 'yyyy',
  dayAriaLabel,
  monthAriaLabel,
  yearAriaLabel,
  nativeInputAriaLabel,
  clearAriaLabel,
  calendarAriaLabel,
  showLeadingZeros = true,
  className = 'w-full text-sm',
  containerClassName = 'w-full',
  required,
  name,
  id,
  autoFocus,
  disableCalendar,
  isOpen,
  onCalendarOpen,
  onCalendarClose,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const resolvedFormat = format || (isEn ? 'MM/dd/yyyy' : 'dd/MM/yyyy');
  const resolvedLocale = locale || (isEn ? 'en-US' : 'id-ID');

  const resolvedClearIcon =
    clearIcon !== undefined ? (
      clearIcon
    ) : (
      <X className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" />
    );

  const resolvedCalendarIcon =
    calendarIcon !== undefined ? (
      calendarIcon
    ) : (
      <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
    );

  // Fix: click handling for leading zero elements so keyboard focus shifts to the adjacent input
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target?.classList?.contains('react-date-picker__inputGroup__leadingZero')) {
      const nextInput = target.nextElementSibling as HTMLInputElement;
      if (nextInput && typeof nextInput.focus === 'function') {
        nextInput.focus();
      }
    }
  };

  return (
    <div className={containerClassName}>
      {label && (
        <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </span>
      )}
      <div className="w-full" onClick={handleContainerClick}>
        <ReactDatePicker
          value={value}
          onChange={onChange as any}
          minDate={minDate}
          maxDate={maxDate}
          format={resolvedFormat}
          locale={resolvedLocale}
          disabled={disabled}
          showLeadingZeros={showLeadingZeros}
          clearIcon={resolvedClearIcon}
          calendarIcon={resolvedCalendarIcon}
          dayPlaceholder={dayPlaceholder}
          monthPlaceholder={monthPlaceholder}
          yearPlaceholder={yearPlaceholder}
          dayAriaLabel={dayAriaLabel || t('activityLog.dayAriaLabel', isEn ? 'Day' : 'Hari')}
          monthAriaLabel={monthAriaLabel || t('activityLog.monthAriaLabel', isEn ? 'Month' : 'Bulan')}
          yearAriaLabel={yearAriaLabel || t('activityLog.yearAriaLabel', isEn ? 'Year' : 'Tahun')}
          nativeInputAriaLabel={nativeInputAriaLabel}
          clearAriaLabel={clearAriaLabel}
          calendarAriaLabel={calendarAriaLabel || t('activityLog.calendarAriaLabel', isEn ? 'Toggle calendar' : 'Buka kalender')}
          className={className}
          required={required}
          name={name}
          id={id}
          autoFocus={autoFocus}
          disableCalendar={disableCalendar}
          isOpen={isOpen}
          onCalendarOpen={onCalendarOpen}
          onCalendarClose={onCalendarClose}
        />
      </div>
    </div>
  );
};

export default DatePicker;
