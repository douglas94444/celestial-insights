alter table public.charts
  add column if not exists timezone_offset_minutes smallint;

comment on column public.charts.timezone_offset_minutes is
  'Offset em minutos a leste de UTC usado em calculateChart (recálculo).';
