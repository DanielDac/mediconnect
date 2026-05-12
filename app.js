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
      console.log(`Intentando UPDATE en ${table} para ID: ${id}`, body);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: sb.headers,
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const err = await r.json();
        console.error("Error detallado de Supabase:", err);
        return false;
      }

      console.log("UPDATE exitoso (Status 204/200)");
      return true;
    } catch (error) {
      console.error("Error de conexión (update):", error);
      return false;
    }
  },
  async delete(table, id) {
    try {
      console.log(`Intentando DELETE en ${table} para ID: ${id}`);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: this.headers
      });
      return r.ok;
    } catch (error) {
      console.error("Error de conexión (delete):", error);
      return false;
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

  async updateUsuario(id, data) {
    try {
      console.log(`Actualizando usuario ${id}...`, data);
      const ok = await sb.update('usuarios', id, data);
      return ok;
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      return false;
    }
  },

  async login(email, password) {
    try {
      console.log(`Intentando login para el email: ${email}`);
      // Consultar usuario por email y password
      const query = `email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`;
      const rows = await sb.select('usuarios', query);

      if (rows && rows.length > 0) {
        this.saveUser(rows[0]);
        console.log("Login exitoso. Rol detectado:", rows[0].rol);
        return true;
      }
      console.warn("Credenciales incorrectas o usuario no encontrado.");
      return false;
    } catch (error) {
      console.error("Fallo el login debido a un error de conexión:", error);
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
      // Usamos el nombre de la relación explícita (donante_id) para evitar ambigüedad con receptor_id
      let query = 'select=*,usuarios!donante_id(nombre)';

      if (filters.estado) query += `&estado=eq.${filters.estado}`;
      if (filters.tipo) query += `&tipo=eq.${encodeURIComponent(filters.tipo)}`;
      if (filters.receptor_id) query += `&receptor_id=eq.${filters.receptor_id}`;
      if (filters.donante_id) query += `&donante_id=eq.${filters.donante_id}`;

      console.log("Query final a Supabase:", query);
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

      if (!currentUser || currentUser.rol !== 'donante') {
        alert("Solo los donantes pueden registrar medicamentos.");
        throw new Error("Acceso denegado.");
      }

      const newDonation = {
        codigo_barras: donation.codigo_barras || null,
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

  async updateDonationStatus(id, estado, newQuantity = null) {
    try {
      const user = this.getUser();
      if (!user) return false;

      console.log(`Actualizando estado de donación ${id} a ${estado}...`);

      const updateData = { estado };
      if (newQuantity !== null) updateData.cantidad = newQuantity;

      // SI SE RECHAZA: Intentar devolver el stock al original si existe
      if (estado === 'rechazado') {
        const currentMed = await this.getDonationById(id);
        if (currentMed && currentMed.estado === 'reservado') {
          console.log("Detectado rechazo de reserva. Intentando restaurar stock...");

          // Buscar si hay una donación disponible del mismo donante para el mismo producto
          const query = `donante_id=eq.${currentMed.donante_id}&nombre=eq.${encodeURIComponent(currentMed.nombre)}&tipo=eq.${encodeURIComponent(currentMed.tipo)}&estado=eq.disponible&fecha_vencimiento=eq.${currentMed.fecha_vencimiento}`;
          const results = await sb.select('donaciones', query);

          if (results && results.length > 0) {
            const original = results[0];
            const newQty = parseInt(original.cantidad) + parseInt(currentMed.cantidad);
            console.log(`Restaurando stock: ${original.cantidad} + ${currentMed.cantidad} = ${newQty}`);

            // A. Sumar al original
            await this.updateDonationStatus(original.id, 'disponible', newQty); // Usar una versión que actualice cantidad

            // B. Eliminar la reserva rechazada para no duplicar datos
            await sb.delete('donaciones', id);
            return true;
          } else {
            // Si no hay un original disponible (raro pero posible), 
            // simplemente lo volvemos a poner como disponible él mismo
            return await sb.update('donaciones', id, { estado: 'disponible', receptor_id: null });
          }
        }
      }

      const ok = await sb.update('donaciones', id, updateData);
      if (ok) console.log("Estado actualizado exitosamente.");
      return ok;
    } catch (error) {
      console.error("Error al actualizar la donación:", error);
      return false;
    }
  },

  async updateDonation(id, donation) {
    try {
      const user = this.getUser();
      if (!user || user.rol !== 'donante') return false;

      console.log(`Actualizando donación ${id}...`, donation);
      const ok = await sb.update('donaciones', id, donation);
      return ok;
    } catch (error) {
      console.error("Error al actualizar donación:", error);
      return false;
    }
  },

  async deleteDonation(id) {
    try {
      const user = this.getUser();
      if (!user || user.rol !== 'donante') return false;

      console.log(`Eliminando donación ${id}...`);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/donaciones?id=eq.${id}`, {
        method: 'DELETE',
        headers: sb.headers
      });
      return r.ok;
    } catch (error) {
      console.error("Error al eliminar donación:", error);
      return false;
    }
  },

  // Nueva función para reservar un medicamento guardando el ID del receptor
  async reserveDonation(id, requestedQuantity = null) {
    try {
      const user = this.getUser();
      if (!user || user.rol !== 'receptor') {
        alert("Solo los receptores pueden reservar medicamentos.");
        return false;
      }

      // 1. Obtener datos actuales del medicamento
      const med = await this.getDonationById(id);
      if (!med || med.estado !== 'disponible') {
        alert("El medicamento ya no está disponible.");
        return false;
      }

      const available = parseInt(med.cantidad);
      const toReserve = requestedQuantity ? parseInt(requestedQuantity) : available;

      if (toReserve > available) {
        alert("No hay suficiente cantidad disponible.");
        return false;
      }

      if (toReserve === available) {
        // Reserva total: solo actualizar estado
        console.log(`Reservando total (${toReserve}) de donación ${id} por el usuario ${user.id}...`);
        return await sb.update('donaciones', id, {
          estado: 'reservado',
          receptor_id: user.id
        });
      } else {
        // Reserva parcial:
        console.log(`Reservando parcial (${toReserve} de ${available}) de donación ${id}...`);

        // A. Actualizar el original con lo que queda
        await sb.update('donaciones', id, { cantidad: available - toReserve });

        // B. Crear una nueva entrada para la reserva
        const newDonation = {
          nombre: med.nombre,
          tipo: med.tipo,
          cantidad: toReserve,
          fecha_vencimiento: med.fecha_vencimiento,
          estado: 'reservado',
          donante_id: med.donante_id,
          receptor_id: user.id,
          imagen_url: med.imagen_url || null,
          created_at: new Date().toISOString()
        };

        return await sb.insert('donaciones', newDonation);
      }
    } catch (error) {
      console.error("Error al reservar donación:", error);
      return false;
    }
  },

  // Obtiene una donación por su ID con JOIN a usuarios para obtener el nombre del donante
  async getDonationById(id) {
    try {
      console.log(`Buscando donación con id: ${id}`);
      const query = `select=*,usuarios!donante_id(nombre)&id=eq.${id}`;
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
  },

  async requestValidatorRole() {
    try {
      const user = this.getUser();
      if (!user) return { success: false, message: 'Usuario no logueado' };
      const data = { usuario_id: user.id, nombre: user.nombre, email: user.email, estado: 'pendiente' };
      console.log("Enviando solicitud de validador...", data);
      
      const r = await fetch(`${SUPABASE_URL}/rest/v1/solicitudes_validador`, {
        method: 'POST',
        headers: sb.headers,
        body: JSON.stringify(data)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error("Error Supabase:", err);
        if (err.code === '23505' || (err.message && err.message.includes('duplicate'))) {
          return { success: false, message: 'duplicate' };
        }
        if (err.code === '42P01' || err.code === 'PGRST205') {
           return { success: false, message: 'Falta la tabla solicitudes_validador' };
        }
        return { success: false, message: err.message || 'Error en la base de datos' };
      }
      return { success: true };
    } catch (error) {
      console.error("Error al solicitar rol de validador:", error);
      return { success: false, message: 'Error de conexión' };
    }
  },

  async getValidatorRequests() {
    try {
      // Solo traemos las pendientes por defecto para el panel
      return await sb.select('solicitudes_validador', 'estado=eq.pendiente');
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
      return [];
    }
  },

  async processValidatorRequest(requestId, status, userId) {
    try {
      console.log(`Procesando solicitud ${requestId} con estado ${status} para usuario ${userId}`);

      // 1. Actualizar la solicitud
      const okReq = await sb.update('solicitudes_validador', requestId, { estado: status });

      // 2. Si es aprobado, actualizar el rol del usuario
      if (okReq && status === 'aprobado') {
        const okUser = await sb.update('usuarios', userId, { rol: 'validador' });
        return okUser;
      }

      return okReq;
    } catch (error) {
      console.error("Error al procesar solicitud:", error);
      return false;
    }
  }
};