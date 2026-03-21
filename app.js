const supabaseClient = supabase.createClient(
    "https://nkiadfcivfgbpvagovib.supabase.co",
    "sb_publishable_G8KQLinduaGFtPbK5uNHVg_woqWiUwJ"
  );
  
  let currentMode = "login";
  let selectedRole = "donante";
  
  const nameInput = document.getElementById("name");
  const submitBtn = document.getElementById("submitBtn");
  
  // Estado inicial
  nameInput.style.display = "none";
  
  // ----------------------
  // TABS
  // ----------------------
  document.getElementById("loginTab").onclick = () => {
    currentMode = "login";
    submitBtn.innerText = "Ingresar";
    nameInput.style.display = "none";
  };
  
  document.getElementById("registerTab").onclick = () => {
    currentMode = "register";
    submitBtn.innerText = "Crear Cuenta";
    nameInput.style.display = "block";
  };
  
  // ----------------------
  // ROLES
  // ----------------------
  document.querySelectorAll(".role").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".role").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
    };
  });
  
  // ----------------------
  // FORM
  // ----------------------
  document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const nombre = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    // ----------------------
    // REGISTRO
    // ----------------------
    if (currentMode === "register") {
  
      // 1. Crear usuario en Auth
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });
  
      if (error) {
        alert(error.message);
        return;
      }
  
      // 2. Guardar en tabla usuarios
      const { error: dbError } = await supabaseClient.from("usuarios").insert([
        {
          nombre: nombre,
          email: email,
          password: password, // ⚠️ solo para proyecto
          rol: selectedRole
        }
      ]);
  
      if (dbError) {
        alert("Error guardando usuario: " + dbError.message);
        return;
      }
  
      alert("Registro exitoso");
  
    }
  
    // ----------------------
    // LOGIN
    // ----------------------
    else {
  
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
  
      if (error) {
        alert(error.message);
        return;
      }
  
      alert("Login exitoso");
  
    }
  
  });