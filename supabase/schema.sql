-- =============================================================================
-- SECURITY URBAN (COMUNA 8 - MEDELLÍN)
-- ESQUEMA SQL CORREGIDO Y ENDURECIDO PARA SUPABASE (ETAPA 1 - REVISIÓN 2)
-- Reemplazo estructurado para las colecciones "usuarios" y "reportes"
-- =============================================================================

-- 1. EXTENSIONES NECESARIAS
create extension if not exists "pgcrypto";

-- =============================================================================
-- 2. TABLA: public.usuarios
-- Conserva exactamente los mismos campos y valores que FirestoreUser
-- =============================================================================
create table if not exists public.usuarios (
  uid text primary key,
  nombre text not null default 'Usuario Comunal',
  correo text not null,
  "fechaRegistro" timestamptz not null default now(),
  "fechaRegistroISO" text not null default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  rol text not null default 'ciudadano'
    check (rol in ('ciudadano', 'operador', 'administrador')),
  estado text not null default 'activo'
    check (estado in ('activo', 'suspendido')),
  sector text not null default 'Comuna 8 - No especificado',
  "ultimoAcceso" text default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  telefono text,
  "correoVerificado" boolean not null default false,
  "codigoVerificacion" text,
  "codigoExpiracion" text,
  "intentosCodigo" integer not null default 0,
  preferencias jsonb not null default '{
    "notificaciones": {
      "alertasPush": true,
      "actualizacionesReportes": true,
      "apoyoTactico": true
    },
    "compartirUbicacion": true,
    "perfilVisibleComunidad": false
  }'::jsonb,
  "fechaActualizacion" text,
  "fechaModificacionRol" text,
  "fechaModificacionEstado" text,
  "fechaActualizacionPreferencias" text
);

-- Índices para búsquedas frecuentes y filtrado en Gestión de Usuarios
create index if not exists idx_usuarios_correo on public.usuarios (lower(correo));
create index if not exists idx_usuarios_rol on public.usuarios (rol);
create index if not exists idx_usuarios_estado on public.usuarios (estado);
create index if not exists idx_usuarios_sector on public.usuarios (sector);

-- =============================================================================
-- 3. TABLA: public.reportes
-- Conserva exactamente los mismos campos y valores que IncidentReport
-- =============================================================================
create table if not exists public.reportes (
  id text primary key default (gen_random_uuid())::text,
  uid text not null references public.usuarios(uid) on delete cascade,
  "autorNombre" text not null default 'Ciudadano Comuna 8',
  "autorEmail" text not null default '',
  titulo text not null,
  categoria text not null,
  descripcion text not null,
  sector text not null default 'Comuna 8',
  direccion text default '',
  ubicacion jsonb not null default '{"lat": 6.2476, "lng": -75.5658}'::jsonb,
  "nivelPrioridad" text not null default 'media'
    check ("nivelPrioridad" in ('baja', 'media', 'alta', 'critica')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptado', 'rechazado')),
  origen text not null default 'usuario'
    check (origen in ('usuario', 'simulacion')),
  "fechaCreacionISO" text not null default to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  "fechaCreacionFormateada" text not null default '',
  "fechaActualizacionISO" text,
  "fechaRevisionISO" text,
  "revisadoPor" text,
  "motivoRechazo" text,
  created_at timestamptz not null default now()
);

-- Índices para consultas de reportes propios, públicos aceptados y panel admin
create index if not exists idx_reportes_uid on public.reportes (uid);
create index if not exists idx_reportes_estado on public.reportes (estado);
create index if not exists idx_reportes_sector on public.reportes (sector);
create index if not exists idx_reportes_categoria on public.reportes (categoria);
create index if not exists idx_reportes_fecha_iso on public.reportes ("fechaCreacionISO" desc);
create index if not exists idx_reportes_estado_origen on public.reportes (estado, origen);

-- =============================================================================
-- 4. FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER)
-- Evitan recursión infinita al evaluar roles y estados dentro de políticas RLS
-- =============================================================================

-- Retorna el rol del usuario autenticado ('ciudadano', 'operador', 'administrador')
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol
  from public.usuarios
  where uid = (auth.uid())::text
  limit 1;
$$;

-- Retorna el estado del usuario autenticado ('activo' o 'suspendido')
create or replace function public.get_my_status()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select estado
  from public.usuarios
  where uid = (auth.uid())::text
  limit 1;
$$;

-- Verifica si el usuario actual está autenticado y su cuenta está en estado 'activo'
create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null and coalesce(public.get_my_status(), 'activo') = 'activo';
$$;

-- Verifica si el usuario actual es un administrador activo
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_active_user() and public.get_my_role() = 'administrador';
$$;

-- Verifica si el usuario actual es un administrador u operador activo
create or replace function public.is_admin_or_operator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_active_user() and public.get_my_role() in ('administrador', 'operador');
$$;

-- =============================================================================
-- 5. TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA: auth.users -> public.usuarios
-- Seguridad corregida: Todo registro nuevo recibe SIEMPRE rol = 'ciudadano'
-- y estado = 'activo'. Nunca asigna 'administrador' por nombre de correo
-- ni permite inyección de rol desde raw_user_meta_data.
-- =============================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_sector text;
  v_now_iso text;
begin
  v_now_iso := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_nombre := coalesce(
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'full_name',
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );
  v_sector := coalesce(
    new.raw_user_meta_data->>'sector',
    'Villa Hermosa, Comuna 8'
  );

  insert into public.usuarios (
    uid,
    nombre,
    correo,
    "fechaRegistro",
    "fechaRegistroISO",
    rol,
    estado,
    sector,
    "ultimoAcceso",
    "correoVerificado"
  )
  values (
    (new.id)::text,
    v_nombre,
    lower(coalesce(new.email, '')),
    now(),
    v_now_iso,
    'ciudadano',
    'activo',
    v_sector,
    v_now_iso,
    (new.email_confirmed_at is not null)
  )
  on conflict (uid) do update set
    correo = excluded.correo,
    "correoVerificado" = (new.email_confirmed_at is not null),
    "ultimoAcceso" = v_now_iso;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_auth_user();

-- =============================================================================
-- 6. PROTECCIÓN DE CAMPOS SENSIBLES EN public.usuarios Y public.reportes
-- =============================================================================

-- 6.1. Impide que un usuario no administrador altere su propio rol, estado, uid o fechas de auditoría
create or replace function public.protect_user_role_and_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Si la operación viene de un cliente autenticado que NO es administrador:
  if auth.uid() is not null and not public.is_admin() then
    new.uid := old.uid;
    new.correo := old.correo;
    new.rol := old.rol;
    new.estado := old.estado;
    new."fechaRegistro" := old."fechaRegistro";
    new."fechaRegistroISO" := old."fechaRegistroISO";
    new."fechaModificacionRol" := old."fechaModificacionRol";
    new."fechaModificacionEstado" := old."fechaModificacionEstado";
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_role_and_status on public.usuarios;
create trigger trg_protect_user_role_and_status
  before update on public.usuarios
  for each row execute function public.protect_user_role_and_status();

-- 6.2. Impide que un ciudadano altere los campos de moderación de su reporte al editar título/descripción
create or replace function public.protect_report_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin_or_operator() then
    new.id := old.id;
    new.uid := old.uid;
    new.estado := old.estado;
    new.origen := old.origen;
    new."fechaCreacionISO" := old."fechaCreacionISO";
    new."fechaCreacionFormateada" := old."fechaCreacionFormateada";
    new."fechaRevisionISO" := old."fechaRevisionISO";
    new."revisadoPor" := old."revisadoPor";
    new."motivoRechazo" := old."motivoRechazo";
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_report_moderation_fields on public.reportes;
create trigger trg_protect_report_moderation_fields
  before update on public.reportes
  for each row execute function public.protect_report_moderation_fields();

-- =============================================================================
-- 7. POLÍTICAS ROW LEVEL SECURITY (RLS) - TABLA public.usuarios
-- =============================================================================
alter table public.usuarios enable row level security;

-- 7.1. Lectura (SELECT):
-- - Un ciudadano u operador SOLO puede leer su propio perfil (uid = auth.uid()).
-- - Un administrador activo puede leer todos los perfiles para gestionarlos en el panel.
drop policy if exists "usuarios_select_policy" on public.usuarios;
create policy "usuarios_select_policy"
  on public.usuarios
  for select
  to authenticated
  using (
    uid = (auth.uid())::text
    or public.is_admin()
  );

-- 7.2. Inserción (INSERT):
-- - El usuario recién registrado solo puede crear su propio perfil con rol = 'ciudadano' y estado = 'activo'.
-- - Un administrador activo puede insertar usuarios desde el panel de administración.
drop policy if exists "usuarios_insert_policy" on public.usuarios;
create policy "usuarios_insert_policy"
  on public.usuarios
  for insert
  to authenticated
  with check (
    (
      uid = (auth.uid())::text
      and rol = 'ciudadano'
      and estado = 'activo'
    )
    or public.is_admin()
  );

-- 7.3. Actualización (UPDATE):
-- - Un usuario activo puede modificar únicamente su propio perfil y está obligado a conservar su mismo rol y estado.
-- - Un administrador activo puede modificar cualquier usuario, incluyendo su rol ('ciudadano', 'operador', 'administrador') y estado ('activo', 'suspendido').
drop policy if exists "usuarios_update_policy" on public.usuarios;
create policy "usuarios_update_policy"
  on public.usuarios
  for update
  to authenticated
  using (
    (uid = (auth.uid())::text and public.is_active_user())
    or public.is_admin()
  )
  with check (
    (
      uid = (auth.uid())::text
      and public.is_active_user()
      and rol = public.get_my_role()
      and estado = public.get_my_status()
    )
    or public.is_admin()
  );

-- 7.4. Eliminación (DELETE):
-- - El propio usuario activo puede eliminar su cuenta o un administrador activo puede hacerlo.
drop policy if exists "usuarios_delete_policy" on public.usuarios;
create policy "usuarios_delete_policy"
  on public.usuarios
  for delete
  to authenticated
  using (
    (uid = (auth.uid())::text and public.is_active_user())
    or public.is_admin()
  );

-- =============================================================================
-- 8. POLÍTICAS ROW LEVEL SECURITY (RLS) - TABLA public.reportes
-- =============================================================================
alter table public.reportes enable row level security;

-- 8.1. Lectura (SELECT):
-- - Un ciudadano activo puede ver únicamente sus propios reportes (en cualquier estado)
--   y los reportes públicos aprobados (estado = 'aceptado').
-- - Administradores y operadores activos pueden ver todos los reportes para gestionarlos.
drop policy if exists "reportes_select_policy" on public.reportes;
create policy "reportes_select_policy"
  on public.reportes
  for select
  to authenticated
  using (
    (public.is_active_user() and uid = (auth.uid())::text)
    or (public.is_active_user() and estado = 'aceptado')
    or public.is_admin_or_operator()
  );

-- 8.2. Inserción (INSERT):
-- - Usuarios activos pueden crear únicamente sus propios reportes (uid = auth.uid())
--   y con estado inicial 'pendiente'.
-- - Administradores y operadores activos también pueden registrar reportes.
drop policy if exists "reportes_insert_policy" on public.reportes;
create policy "reportes_insert_policy"
  on public.reportes
  for insert
  to authenticated
  with check (
    (
      public.is_active_user()
      and uid = (auth.uid())::text
      and estado = 'pendiente'
    )
    or public.is_admin_or_operator()
  );

-- 8.3. Actualización (UPDATE):
-- - Un ciudadano activo puede editar únicamente sus propios reportes (título/descripción) sin alterar su estado.
-- - Administradores y operadores activos pueden aprobar ('aceptado') o rechazar ('rechazado') reportes.
drop policy if exists "reportes_update_policy" on public.reportes;
create policy "reportes_update_policy"
  on public.reportes
  for update
  to authenticated
  using (
    (public.is_active_user() and uid = (auth.uid())::text)
    or public.is_admin_or_operator()
  )
  with check (
    (
      public.is_active_user()
      and uid = (auth.uid())::text
      and estado = 'pendiente'
    )
    or public.is_admin_or_operator()
  );

-- 8.4. Eliminación (DELETE):
-- - El autor activo puede eliminar sus propios reportes o un administrador/operador activo puede hacerlo.
drop policy if exists "reportes_delete_policy" on public.reportes;
create policy "reportes_delete_policy"
  on public.reportes
  for delete
  to authenticated
  using (
    (public.is_active_user() and uid = (auth.uid())::text)
    or public.is_admin_or_operator()
  );

-- =============================================================================
-- 9. HABILITAR SUPABASE REALTIME PARA AMBAS TABLAS
-- =============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'usuarios'
  ) then
    alter publication supabase_realtime add table public.usuarios;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reportes'
  ) then
    alter publication supabase_realtime add table public.reportes;
  end if;
end $$;
