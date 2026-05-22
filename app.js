// ===== MediConnect – app.js =====

const SUPABASE_URL = 'https://htuagycwflhqxghhotjf.supabase.co';

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
        method: 'POST',
        headers: sb.headers,
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const err = await r.json();
        console.error(`Error al insertar en la tabla ${table}:`, err);
        return null;
      }

      const data = await r.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (error) {
      console.error("Error de conexión (insert):", error);
      return null;
    }
  },

  async update(table, id, body) {
    try {
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

      return true;
    } catch (error) {
      console.error("Error de conexión (update):", error);
      return false;
    }
  },

  async delete(table, id) {
    try {
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

  async uploadImage(file) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}_${safeName}`;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/medicamentos/${filename}`;

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

      const rawText = await r.text();

      let responseBody = {};
      try {
        responseBody = JSON.parse(rawText);
      } catch (_) {
        responseBody = { raw: rawText };
      }

      if (!r.ok) {
        console.error("Error en subida de imagen:", responseBody);
        return null;
      }

      return `${SUPABASE_URL}/storage/v1/object/public/medicamentos/${filename}`;
    } catch (error) {
      console.error("Error de conexión al subir imagen:", error);
      return null;
    }
  },

  async testStorage() {
    const r1 = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });

    const buckets = await r1.json().catch(() => r1.text());

    const r2 = await fetch(`${SUPABASE_URL}/storage/v1/object/list/medicamentos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 5 })
    });

    const objetos = await r2.json().catch(() => r2.text());

    return { buckets, objetos };
  }
};

const USER_KEY = 'mc_user';

const mediConnect = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(USER_KEY);
  },

  async updateUsuario(id, data) {
    try {
      return await sb.update('usuarios', id, data);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      return false;
    }
  },

  async login(email, password) {
    try {
      const query = `email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`;
      const rows = await sb.select('usuarios', query);

      if (rows && rows.length > 0) {
        this.saveUser(rows[0]);
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
      const user = await sb.insert('usuarios', { nombre, email, password, rol });

      if (user) {
        this.saveUser(user);
        return {
          success: true,
          user,
          message: "Cuenta creada exitosamente"
        };
      }

      return {
        success: false,
        message: "El email ya está registrado"
      };
    } catch (error) {
      console.error("Error al registrarse:", error);
      return {
        success: false,
        message: "Error de conexión"
      };
    }
  },

  async getDonations(filters = {}) {
    try {
      let query = 'select=*';

      if (!filters.skipJoin) {
        query = 'select=*,donante:usuarios!donante_id(nombre),receptor:usuarios!receptor_id(nombre)';
      }

      if (filters.estado) query += `&estado=eq.${filters.estado}`;
      if (filters.tipo) query += `&tipo=eq.${encodeURIComponent(filters.tipo)}`;
      if (filters.receptor_id) query += `&receptor_id=eq.${filters.receptor_id}`;
      if (filters.donante_id) query += `&donante_id=eq.${filters.donante_id}`;

      const data = await sb.select('donaciones', query).catch(err => {
        console.warn("Fallo el join, reintentando consulta simple...", err);
        return sb.select('donaciones', 'select=*');
      });

      return (data || []).map(d => ({
        ...d,
        donante: d.donante?.nombre || d.usuarios?.nombre || 'Donante anónimo',
        receptor_nombre: d.receptor?.nombre || null
      }));
    } catch (error) {
      console.error("Error al obtener donaciones:", error);
      alert("No se pudieron cargar las donaciones.");
      return [];
    }
  },

  async addDonation(donation) {
    try {
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
        lat: donation.lat || null,
        lng: donation.lng || null,
        imagen_url: donation.imagen_url || null
      };

      const result = await sb.insert('donaciones', newDonation);

      if (result) return result;

      throw new Error("No se devolvió respuesta al insertar");
    } catch (error) {
      console.error("Error al registrar la donación:", error);
      alert("Error al guardar la donación. Revisa la consola.");
      return null;
    }
  },

  async updateDonationStatus(id, estado, newQuantity = null, evidenciaUrl = null) {
    try {
      const user = this.getUser();
      if (!user) return false;

      const updateData = { estado };

      if (newQuantity !== null) updateData.cantidad = newQuantity;
      if (evidenciaUrl !== null) updateData.evidencia_url = evidenciaUrl;

      if (estado === 'rechazado') {
        const currentMed = await this.getDonationById(id);

        if (currentMed && currentMed.estado === 'reservado') {
          const query = `donante_id=eq.${currentMed.donante_id}&nombre=eq.${encodeURIComponent(currentMed.nombre)}&tipo=eq.${encodeURIComponent(currentMed.tipo)}&estado=eq.disponible&fecha_vencimiento=eq.${currentMed.fecha_vencimiento}`;
          const results = await sb.select('donaciones', query);

          if (results && results.length > 0) {
            const original = results[0];
            const newQty = parseInt(original.cantidad) + parseInt(currentMed.cantidad);

            await this.updateDonationStatus(original.id, 'disponible', newQty);
            await sb.delete('donaciones', id);

            return true;
          }

          return await sb.update('donaciones', id, {
            estado: 'disponible',
            receptor_id: null
          });
        }
      }

      let ok = false;

      if (evidenciaUrl) {
        ok = await sb.update('donaciones', id, updateData);

        if (!ok) {
          console.warn("Fallo al actualizar con evidencia_url. Reintentando solo con estado...");
          delete updateData.evidencia_url;
          ok = await sb.update('donaciones', id, updateData);
        }
      } else {
        ok = await sb.update('donaciones', id, updateData);
      }

      if (ok && evidenciaUrl) {
        localStorage.setItem('evidence_' + id, evidenciaUrl);
      }

      return ok;
    } catch (error) {
      console.error("Error al actualizar la donación:", error);
      return false;
    }
  },

  async submitEvidence(id, firmaUrl, fotoUrl) {
    try {
      const user = this.getUser();
      if (!user) return false;

      const updateData = {};

      if (firmaUrl) updateData.firma_url = firmaUrl;
      if (fotoUrl) updateData.evidencia_url = fotoUrl;

      const ok = await sb.update('donaciones', id, updateData);

      if (ok) {
        if (firmaUrl) localStorage.setItem('firma_' + id, firmaUrl);
        if (fotoUrl) localStorage.setItem('evidencia_' + id, fotoUrl);
      }

      return ok;
    } catch (error) {
      console.error("Error al guardar evidencia:", error);
      return false;
    }
  },

  async updateDonation(id, donation) {
    try {
      const user = this.getUser();
      if (!user || user.rol !== 'donante') return false;

      return await sb.update('donaciones', id, donation);
    } catch (error) {
      console.error("Error al actualizar donación:", error);
      return false;
    }
  },

  async deleteDonation(id) {
    try {
      const user = this.getUser();
      if (!user || user.rol !== 'donante') return false;

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

  async reserveDonation(id, requestedQuantity = null) {
    try {
      const user = this.getUser();

      if (!user || user.rol !== 'receptor') {
        return {
          success: false,
          message: "Solo los receptores pueden reservar medicamentos."
        };
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      const recentResQuery = `select=id&receptor_id=eq.${user.id}&created_at=gte.${encodeURIComponent(monthStart)}&created_at=lt.${encodeURIComponent(nextMonthStart)}&estado=neq.rechazado`;
      const recentReservations = await sb.select('donaciones', recentResQuery);

      if (recentReservations && recentReservations.length >= 3) {
        return {
          success: false,
          message: "Solo puedes reservar hasta 3 donaciones por mes."
        };
      }

      const med = await this.getDonationById(id);

      if (!med || med.estado !== 'disponible') {
        return {
          success: false,
          message: "El medicamento ya no está disponible."
        };
      }

      const available = parseInt(med.cantidad);
      const toReserve = requestedQuantity ? parseInt(requestedQuantity) : available;

      if (toReserve > available) {
        return {
          success: false,
          message: "No hay suficiente cantidad disponible."
        };
      }

      if (toReserve === available) {
        const ok = await sb.update('donaciones', id, {
          estado: 'reservado',
          receptor_id: user.id
        });

        return ok
          ? { success: true, message: 'Reserva realizada con éxito' }
          : { success: false, message: 'No se pudo realizar la reserva.' };
      }

      await sb.update('donaciones', id, {
        cantidad: available - toReserve
      });

      const newDonation = {
        nombre: med.nombre,
        tipo: med.tipo,
        cantidad: toReserve,
        fecha_vencimiento: med.fecha_vencimiento,
        estado: 'reservado',
        donante_id: med.donante_id,
        receptor_id: user.id,
        imagen_url: med.imagen_url || null,
        lat: med.lat || null,
        lng: med.lng || null,
        created_at: new Date().toISOString()
      };

      const created = await sb.insert('donaciones', newDonation);

      return created
        ? { success: true, message: 'Reserva realizada con éxito' }
        : { success: false, message: 'No se pudo crear la reserva parcial.' };
    } catch (error) {
      console.error("Error al reservar donación:", error);
      return {
        success: false,
        message: 'Error de conexión al realizar la reserva'
      };
    }
  },

  async cancelReservation(id) {
    try {
      const user = this.getUser();

      if (!user || user.rol !== 'receptor') {
        return {
          success: false,
          message: 'Solo los receptores pueden cancelar reservas.'
        };
      }

      const current = await this.getDonationById(id);

      if (!current || current.estado !== 'reservado' || current.receptor_id !== user.id) {
        return {
          success: false,
          message: 'Esta reserva no existe o ya fue procesada.'
        };
      }

      const query = `donante_id=eq.${current.donante_id}&nombre=eq.${encodeURIComponent(current.nombre)}&tipo=eq.${encodeURIComponent(current.tipo)}&estado=eq.disponible&fecha_vencimiento=eq.${current.fecha_vencimiento}`;
      const results = await sb.select('donaciones', query);

      if (results && results.length > 0) {
        const original = results[0];
        const newQty = parseInt(original.cantidad) + parseInt(current.cantidad);

        await sb.update('donaciones', original.id, {
          cantidad: newQty
        });

        await sb.delete('donaciones', id);
      } else {
        await sb.update('donaciones', id, {
          estado: 'disponible',
          receptor_id: null
        });
      }

      return {
        success: true,
        message: 'Reserva cancelada correctamente.'
      };
    } catch (error) {
      console.error("Error al cancelar reserva:", error);
      return {
        success: false,
        message: 'Error al cancelar la reserva.'
      };
    }
  },

  async getDonationById(id) {
    try {
      const query = `select=*,donante:usuarios!donante_id(nombre),receptor:usuarios!receptor_id(nombre)&id=eq.${id}`;

      const data = await sb.select('donaciones', query).catch(err => {
        console.warn("Fallo el join en getDonationById, reintentando consulta simple...", err);
        return sb.select('donaciones', `select=*&id=eq.${id}`);
      });

      if (data && data.length > 0) {
        const d = data[0];

        return {
          ...d,
          donante: d.donante?.nombre || d.usuarios?.nombre || 'Donante anónimo',
          receptor_nombre: d.receptor?.nombre || null
        };
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

      if (!user) {
        return {
          success: false,
          message: 'Usuario no logueado'
        };
      }

      const data = {
        usuario_id: user.id,
        nombre: user.nombre,
        email: user.email,
        estado: 'pendiente'
      };

      const r = await fetch(`${SUPABASE_URL}/rest/v1/solicitudes_validador`, {
        method: 'POST',
        headers: sb.headers,
        body: JSON.stringify(data)
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));

        console.error("Error Supabase:", err);

        if (err.code === '23505' || (err.message && err.message.includes('duplicate'))) {
          return {
            success: false,
            message: 'duplicate'
          };
        }

        if (err.code === '42P01' || err.code === 'PGRST205') {
          return {
            success: false,
            message: 'Falta la tabla solicitudes_validador'
          };
        }

        return {
          success: false,
          message: err.message || 'Error en la base de datos'
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error al solicitar rol de validador:", error);
      return {
        success: false,
        message: 'Error de conexión'
      };
    }
  },

  async getValidatorRequests() {
    try {
      return await sb.select('solicitudes_validador', 'estado=eq.pendiente');
    } catch (error) {
      console.error("Error al obtener solicitudes:", error);
      return [];
    }
  },

  async processValidatorRequest(requestId, status, userId) {
    try {
      const okReq = await sb.update('solicitudes_validador', requestId, {
        estado: status
      });

      if (okReq && status === 'aprobado') {
        return await sb.update('usuarios', userId, {
          rol: 'validador'
        });
      }

      return okReq;
    } catch (error) {
      console.error("Error al procesar solicitud:", error);
      return false;
    }
  }
};

// ===== CIERRE DE SESIÓN POR INACTIVIDAD =====

const INACTIVITY_TIME = 15 * 60 * 1000;

let inactivityTimer;

function startInactivityTimer() {
  clearTimeout(inactivityTimer);
  localStorage.setItem('session_expiry', Date.now() + INACTIVITY_TIME);

  inactivityTimer = setTimeout(() => {
    mediConnect.logout();
    localStorage.clear();
    alert('Tu sesión ha sido cerrada por inactividad.');
    window.location.href = 'index.html';
  }, INACTIVITY_TIME);
}

['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach((event) => {
  document.addEventListener(event, () => {
    if (mediConnect.getUser()) startInactivityTimer();
  });
});

const originalSaveUser = mediConnect.saveUser;

mediConnect.saveUser = function(user) {
  originalSaveUser.call(this, user);
  startInactivityTimer();
};

(function checkSessionExpiry() {
  const expiry = localStorage.getItem('session_expiry');

  if (expiry && Date.now() > parseInt(expiry)) {
    mediConnect.logout();
    localStorage.clear();

    if (!window.location.pathname.includes('index.html')) {
      window.location.href = 'index.html';
    }
  } else if (mediConnect.getUser()) {
    startInactivityTimer();
  }
})();