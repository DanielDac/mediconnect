const supabaseClient = supabase.createClient(
  "https://nkiadfcivfgbpvagovib.supabase.co",
  "sb_publishable_G8KQLinduaGFtPbK5uNHVg_woqWiUwJ"
);

// REGISTRO
async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Registro exitoso");
    window.location.href = "login.html";
  }
}

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "dashboard.html";
  }
}

// LOGOUT
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}