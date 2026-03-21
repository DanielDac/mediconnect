// ===== MediConnect – app.js =====

const SUPABASE_URL = 'https://nkiadfcivfgbpvagovib.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G8KQLinduaGFtPbK5uNHVg_woqWiUwJ';

const sb = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer': 'return=representation'
  },
  async select(table, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&order=created_at.desc`;
    const r = await fetch(url, { headers: sb.headers });
    return r.ok ? await r.json() : [];
  },
  async insert(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST', headers: sb.headers, body: JSON.stringify(body)
    });
    const data = await r.json();
    return r.ok ? (Array.isArray(data) ? data[0] : data) : null;
  },
  async update(table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH', headers: sb.headers, body: JSON.stringify(body)
    });
    return r.ok;
  }
};

const USER_KEY = 'mc_user';

const DEMO_DONATIONS = [
  { id: 'don-001', nombre: 'Amoxicilina 500mg',  tipo: 'Antibiótico',     cantidad: 10, fecha_vencimiento: '2026-12-15', donante: 'Farmacia Central', estado: 'disponible', created_at: '2026-02-12' },
  { id: 'don-002', nombre: 'Ibuprofeno 400mg',   tipo: 'Antiinflamatorio', cantidad: 5,  fecha_vencimiento: '2026-08-20', donante: 'Juan Pérez',       estado: 'disponible', created_at: '2026-02-10' },
  { id: 'don-003', nombre: 'Insulina Glargina',  tipo: 'Antidiabético',   cantidad: 2,  fecha_vencimiento: '2026-05-10', donante: 'María López',      estado: 'reservado',  created_at: '2026-01-20' },
  { id: 'don-004', nombre: 'Paracetamol 500mg',  tipo: 'Analgésico',      cantidad: 20, fecha_vencimiento: '2027-01-01', donante: 'Clínica Norte',    estado: 'disponible', created_at: '2026-01-15' },
];

const mediConnect = {
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem(USER_KEY);
  },
  async login(nombre, rol) {
    try {
      const rows = await sb.select('usuarios', `nombre=ilike.${encodeURIComponent(nombre)}&rol=eq.${rol}`);
      if (rows && rows.length > 0) { this.saveUser(rows[0]); return true; }
      this.saveUser({ nombre, rol, id: 'demo-' + Date.now() });
      return true;
    } catch {
      this.saveUser({ nombre, rol, id: 'demo-' + Date.now() });
      return true;
    }
  },
  async register(nombre, email, password, rol) {
    try {
      const user = await sb.insert('usuarios', { nombre, email, password, rol });
      if (user) { this.saveUser(user); return true; }
      const demo = { id: 'demo-' + Date.now(), nombre, email, rol };
      this.saveUser(demo); return true;
    } catch {
      const demo = { id: 'demo-' + Date.now(), nombre, email, rol };
      this.saveUser(demo); return true;
    }
  },
  async getDonations(filters = {}) {
    try {
      let query = '';
      if (filters.estado) query += `estado=eq.${filters.estado}&`;
      if (filters.tipo)   query += `tipo=eq.${encodeURIComponent(filters.tipo)}&`;
      const data = await sb.select('donaciones', query);
      if (data && data.length > 0) return data;
      const local = JSON.parse(localStorage.getItem('mc_local_donations') || '[]');
      return [...local, ...DEMO_DONATIONS];
    } catch {
      return DEMO_DONATIONS;
    }
  },
  async addDonation(donation) {
    try {
      const result = await sb.insert('donaciones', donation);
      if (result) return result;
      throw new Error('fail');
    } catch {
      const id = 'don-' + Math.random().toString(36).substr(2, 6);
      const newDon = { ...donation, id, created_at: new Date().toISOString() };
      const local = JSON.parse(localStorage.getItem('mc_local_donations') || '[]');
      local.unshift(newDon);
      localStorage.setItem('mc_local_donations', JSON.stringify(local));
      return newDon;
    }
  },
  async updateDonationStatus(id, estado) {
    try { return await sb.update('donaciones', id, { estado }); }
    catch { return false; }
  }
};