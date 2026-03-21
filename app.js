const supabaseClient = supabase.createClient(
    "https://nkiadfcivfgbpvagovib.supabase.co",
    "sb_publishable_G8KQLinduaGFtPbK5uNHVg_woqWiUwJ"
  );
  
  let currentMode = "register";
  let selectedRole = "donante";
  
  // ----------------------
  // CAMBIO DE TABS
  // ----------------------
  document.getElementById("loginTab").onclick = () => {
    currentMode = "login";
    document.getElementById("submitBtn").innerText = "Ingresar";
  };
  
  document.getElementById("registerTab").onclick = () => {
    currentMode = "register";
    document.getElementById("submitBtn").innerText = "Crear Cuenta";
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
  // FORM (LOGIN + REGISTER)
  // ----------------------
  document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const name = document.getElementById("name").value;
  
    // REGISTRO
    if (currentMode === "register") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });
  
      if (error) {
        alert(error.message);
        return;
      }
  
      // Guardar datos extra (nombre + rol)
      if (data.user) {
        await supabaseClient.from("profiles").insert([
          {
            id: data.user.id,
            name: name,
            role: selectedRole
          }
        ]);
      }
  
      alert("Registro exitoso");
    }
  
    // LOGIN
    else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
  
      if (error) {
        alert(error.message);
        return;
      }
  
      window.location.href = "dashboard.html";
    }
  });
  
  // ----------------------
  // LOGOUT
  // ----------------------
  async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  }