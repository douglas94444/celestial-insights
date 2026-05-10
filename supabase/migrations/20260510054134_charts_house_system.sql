alter table public.charts
  add column if not exists house_system text not null default 'placidus';

alter table public.charts
  drop constraint if exists charts_house_system_check;

alter table public.charts
  add constraint charts_house_system_check
  check (house_system in ('placidus', 'equal', 'whole_sign'));

comment on column public.charts.house_system is
  'Sistema de casas usado ao calcular/gravar o mapa (snapshot).';
