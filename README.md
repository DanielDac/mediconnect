# MediConnect – Guía de Configuración

## 📁 Archivos del proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Página de Login / Registro |
| `dashboard.html` | Panel principal |
| `buscar.html` | Buscar medicamentos |
| `donar.html` | Registrar donación |
| `perfil.html` | Perfil del usuario |
| `style.css` | Estilos globales |
| `app.js` | Lógica + conexión Supabase |

---

## ⚙️ Configurar Supabase

1. Abre `app.js`
2. Reemplaza estas dos líneas al inicio del archivo:

```js
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';  // ← tu URL
const SUPABASE_KEY = 'TU-ANON-KEY';                      // ← tu clave anon
```

Puedes encontrar estos valores en tu proyecto de Supabase:
**Settings → API → Project URL** y **anon public key**

---

## 🗄️ Tablas requeridas en Supabase

### Tabla: `usuarios`
```sql
create table usuarios (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  email text,
  password text,
  rol text default 'donante',
  created_at timestamp default now()
);
```

### Tabla: `donaciones`
```sql
create table donaciones (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  tipo text not null,
  cantidad int not null,
  fecha_vencimiento date not null,
  donante text,
  estado text default 'disponible',
  created_at timestamp default now()
);
```

---

## 🚀 Modo Demo (sin Supabase)

Si **no configuras Supabase**, la app funciona en modo demo:
- Puedes iniciar sesión con cualquier nombre
- Se muestran datos de ejemplo
- Las donaciones se guardan en `localStorage` del navegador

---

## 📱 Navegación

| Pantalla | Botón en la barra inferior |
|---|---|
| Inicio (dashboard) | 🏠 |
| Buscar medicamentos | 🔍 |
| Registrar donación | ➕ (botón central) |
| Perfil | 👤 |
