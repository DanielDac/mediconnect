// ===== MediConnect – app.js =====

const SUPABASE_URL = 'https://htuagycwflhqxghhotjf.supabase.co';
// IMPORTANTE: Reemplaza esto con tu verdadera anon public key
const SUPABASE_KEY = 'sb_publishable_y6Py69cWc_hxdXlZHE2ivw_HHweYutU';

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
      let query = '';
      if (filters.estado) query += `estado=eq.${filters.estado}&`;
      if (filters.tipo) query += `tipo=eq.${encodeURIComponent(filters.tipo)}&`;

      if (query.endsWith('&')) query = query.slice(0, -1);

      const data = await sb.select('donaciones', query);
      console.log("Donaciones obtenidas:", data);
      return data || [];
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
        donante_id: currentUser.id
      };

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
  }
};