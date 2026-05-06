// ===== MediConnect – app.js =====

const SUPABASE_URL = 'https://htuagycwflhqxghhotjf.supabase.co';
// IMPORTANTE: Reemplaza esto con tu verdadera anon public key
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dWFneWN3ZmxocXhnaGhvdGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTM5MzgsImV4cCI6MjA5MzA4OTkzOH0.i_u0YEuO3DLyhTVjpf0jUNW0ZLnf4p0eG5yCGCzi_Tw';

const sb = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer': 'return=representation'
  },
  async select(table, query = '') {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&order=created_at.desc`;
      const r = await fetch(url, { headers: sb.headers });
      if (!r.ok) {
        const err = await r.json();
        console.error(`Error al consultar la tabla ${table}:`, err);
        throw new Error(err.message || 'Error en la consulta');
      }
      return await r.json();
    } catch (error) {
      console.error("Error de conexión (select):", error);
      throw error;
    }
  },
  async insert(table, body) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST', headers: sb.headers, body: JSON.stringify(body)
      });
      if (!r.ok) {
        const err = await r.json();
        console.error(`Error al insertar en la tabla ${table}:`, err);
        throw new Error(err.message || 'Error al insertar');
      }
      const data = await r.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error("Error de conexión (insert):", error);
      throw error;
    }
  },
  async update(table, id, body) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH', headers: sb.headers, body: JSON.stringify(body)
      });
      if (!r.ok) {
        const err = await r.json();
        console.error(`Error al actualizar la tabla ${table}:`, err);
        throw new Error(err.message || 'Error al actualizar');
      }
      return true;
    } catch (error) {
      console.error("Error de conexión (update):", error);
      throw error;
    }
  },

  // Sube un archivo al bucket 'medicamentos' en Supabase Storage.
  // Devuelve la URL pública si tiene éxito, o null si falla (nunca bloquea el flujo).
  async uploadImage(file) {
    try {
      console.log("──── INICIO SUBIDA DE IMAGEN ────");
      console.log("Archivo:", file);
      console.log("Nombre:", file.name, "| Tipo:", file.type, "| Tamaño:", file.size, "bytes");

      // Nombre de archivo único para evitar colisiones en el bucket
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}_${safeName}`;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/medicamentos/${filename}`;

      console.log("URL de subida:", uploadUrl);
      console.log("apikey usada (primeros 20 chars):", SUPABASE_KEY.substring(0, 20) + '...');

      const r = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: file
      });

      console.log("Respuesta status:", r.status, r.statusText);

      // Leer el cuerpo como texto primero para no perderlo si no es JSON
      const rawText = await r.text();
      console.log("Respuesta raw:", rawText);

      let responseBody = {};
      try { responseBody = JSON.parse(rawText); } catch (_) { responseBody = { raw: rawText }; }
      console.log("Respuesta body (parseado):", responseBody);

      if (!r.ok) {
        console.error("──── ERROR EN SUBIDA DE IMAGEN ────");
        console.error("Status HTTP:", r.status, r.statusText);
        console.error("Cuerpo del error:", responseBody);
        if (r.status === 400) console.error("  → 400: Solicitud inválida. Verifica Content-Type y que el body sea el archivo binario.");
        if (r.status === 401) console.error("  → 401: No autorizado. La apikey/anon key es incorrecta o no tiene acceso a Storage.");
        if (r.status === 403) console.error("  → 403: Prohibido. El bucket 'medicamentos' no tiene política RLS que permita INSERT al rol anon.");
        if (r.status === 404) console.error("  → 404: Bucket 'medicamentos' NO EXISTE en Supabase Storage. Créalo primero.");
        console.error("  Solución: Supabase → Storage → Buckets → medicamentos → Policies → New Policy → Allow INSERT for anon");
        return null;
      }

      // URL pública del objeto (el bucket debe estar marcado como público en Supabase)
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/medicamentos/${filename}`;
      console.log("──── IMAGEN SUBIDA EXITOSAMENTE ────");
      console.log("URL imagen:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("Error de conexión al subir imagen:", error);
      return null;
    }
  },

  // Función de diagnóstico: ejecutar desde la consola del navegador → sb.testStorage()
  async testStorage() {
    console.log("=== TEST DE ACCESO A SUPABASE STORAGE ===");
    console.log("URL:", SUPABASE_URL);
    console.log("Key (primeros 30):", SUPABASE_KEY.substring(0, 30) + '...');

    // Test 1: listar buckets
    const r1 = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const buckets = await r1.json().catch(() => r1.text());
    console.log("Buckets disponibles (status", r1.status + "):", buckets);

    // Test 2: listar objetos del bucket medicamentos
    const r2 = await fetch(`${SUPABASE_URL}/storage/v1/object/list/medicamentos`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: 5 })
    });
    const objs = await r2.json().catch(() => r2.text());
    console.log("Objetos en bucket 'medicamentos' (status", r2.status + "):", objs);

    console.log("=== FIN TEST ===");
    return { buckets, objetos: objs };
  }
};

const USER_KEY = 'mc_user';

const mediConnect = {
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    console.log("Usuario guardado en sesión:", user);
  },
  logout() {
    localStorage.removeItem(USER_KEY);
    console.log("Sesión cerrada.");
  },

  async login(email, password, rol) {
    try {
      console.log(`Intentando login para el email: ${email} con rol: ${rol}`);
      // Consultar usuario por email, password y rol usando eq (igualdad exacta)
      const query = `email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&rol=eq.${rol}`;
      const rows = await sb.select('usuarios', query);

      if (rows && rows.length > 0) {
        this.saveUser(rows[0]);
        console.log("Login exitoso.");
        return true;
      }
      console.warn("Credenciales incorrectas o usuario no encontrado.");
      alert("Credenciales incorrectas o usuario no existe.");
      return false;
    } catch (error) {
      console.error("Fallo el login debido a un error de conexión:", error);
      alert("Error al intentar iniciar sesión. Verifica la consola.");
      return false;
    }
  },

  async register(nombre, email, password, rol) {
    try {
      console.log(`Registrando nuevo usuario: ${nombre}`);
      const userBody = { nombre, email, password, rol };
      const user = await sb.insert('usuarios', userBody);

      if (user) {
        this.saveUser(user);
        console.log("Registro exitoso.");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al registrarse:", error);
      alert("Error al crear cuenta. Verifica la conexión.");
      return false;
    }
  },

  async getDonations(filters = {}) {
    try {
      console.log("Obteniendo donaciones...");

      // Se agrega select=*,usuarios(nombre) para hacer JOIN con la tabla usuarios
      // Supabase PostgREST resuelve el JOIN automáticamente usando la FK donante_id → usuarios.id
      let query = 'select=*,usuarios(nombre)';
      if (filters.estado) query += `&estado=eq.${filters.estado}`;
      if (filters.tipo) query += `&tipo=eq.${encodeURIComponent(filters.tipo)}`;

      const data = await sb.select('donaciones', query);
      console.log("Donaciones crudas desde Supabase (con join):", data);

      // Mapear para que cada donación tenga el campo "donante" con el nombre del usuario
      const mapped = (data || []).map(d => ({
        ...d,
        donante: d.usuarios?.nombre || d.donante || 'Donante anónimo'
      }));

      console.log("Donaciones mapeadas (con donante):", mapped);
      return mapped;
    } catch (error) {
      console.error("Error al obtener donaciones:", error);
      alert("No se pudieron cargar las donaciones.");
      return [];
    }
  },

  async addDonation(donation) {
    try {
      console.log("Registrando nueva donación...");
      const currentUser = this.getUser();

      if (!currentUser) {
        alert("No hay usuario autenticado.");
        throw new Error("No hay usuario autenticado.");
      }

      const newDonation = {
        nombre: donation.nombre,
        tipo: donation.tipo,
        cantidad: donation.cantidad,
        fecha_vencimiento: donation.fecha_vencimiento,
        estado: donation.estado || 'disponible',
        donante_id: currentUser.id,
        // imagen_url viene del proceso de subida en donar.html (null si no hay imagen o falló)
        imagen_url: donation.imagen_url || null
      };
      console.log("imagen_url a guardar:", newDonation.imagen_url);

      const result = await sb.insert('donaciones', newDonation);
      if (result) {
        console.log("Donación registrada correctamente:", result);
        return result;
      }
      throw new Error("No se devolvió respuesta al insertar");
    } catch (error) {
      console.error("Error al registrar la donación:", error);
      alert("Error al guardar la donación. Revisa la consola.");
      return null;
    }
  },

  async updateDonationStatus(id, estado) {
    try {
      console.log(`Actualizando estado de donación ${id} a ${estado}...`);
      const ok = await sb.update('donaciones', id, { estado });
      if (ok) console.log("Estado actualizado exitosamente.");
      return ok;
    } catch (error) {
      console.error("Error al actualizar la donación:", error);
      alert("Error al actualizar estado. Revisa la consola.");
      return false;
    }
  },

  // Obtiene una donación por su ID con JOIN a usuarios para obtener el nombre del donante
  async getDonationById(id) {
    try {
      console.log(`Buscando donación con id: ${id}`);
      const query = `select=*,usuarios(nombre)&id=eq.${id}`;
      const data = await sb.select('donaciones', query);
      console.log("Donación cruda por ID (con join):", data);

      if (data && data.length > 0) {
        const d = data[0];
        const mapped = {
          ...d,
          donante: d.usuarios?.nombre || d.donante || 'Donante anónimo'
        };
        console.log("Donación mapeada por ID:", mapped);
        return mapped;
      }

      console.warn(`No se encontró donación con id: ${id}`);
      return null;
    } catch (error) {
      console.error("Error al obtener donación por ID:", error);
      return null;
    }
  }
};