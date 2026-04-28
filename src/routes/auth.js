const { getUsers, saveUsers } = require("../models/users");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

async function handleAuthRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- 1. RUTA: INICIAR LOGIN CON GOOGLE ---
  if (url.pathname === "/auth/google" && req.method === "GET") {
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "select_account", // Forzamos a que siempre pueda elegir cuenta
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });

    res.writeHead(302, { Location: authorizeUrl });
    res.end();
    return true;
  }

  // --- 2. RUTA: CALLBACK DE GOOGLE ---
  if (url.pathname === "/auth/google/callback" && req.method === "GET") {
    try {
      const code = url.searchParams.get("code");
      if (!code) throw new Error("No se recibió el código de Google");

      // Intercambio de código por tokens (Aquí daba el ETIMEDOUT)
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      let users = await getUsers();
      let userIndex = users.findIndex((u) => u.email === payload.email);

      // CASO A: El usuario NO existe en el JSON
      if (userIndex === -1) {
        console.warn(
          `❌ Google No-Match: ${payload.email} no está autorizado.`,
        );
        // Redirigimos al login con un mensaje claro. ¡No lo dejamos pasar al chat!
        res.writeHead(302, { Location: "/login.html?error=user_not_found" });
        res.end();
        return true;
      }

      // CASO B: Usuario encontrado (Adriana)
      console.log(`✅ Google Match: ${users[userIndex].name}`);

      users[userIndex].status = "online";
      await saveUsers(users);

      const loggedUser = { ...users[userIndex] };
      delete loggedUser.password;

      // Usamos encodeURIComponent para evitar errores con tildes (Flórez)
      const cookieData = encodeURIComponent(JSON.stringify(loggedUser));

      res.writeHead(302, {
        "Set-Cookie": `loggedUser=${cookieData}; Path=/; Max-Age=3600`,
        Location: "/chat.html",
      });
      res.end();
    } catch (err) {
      console.error("❌ Error crítico en Callback de Google:", err.message);
      // Si hay timeout o error de Google, volvemos al login de forma segura
      res.writeHead(302, { Location: "/login.html?error=google_timeout" });
      res.end();
    }
    return true;
  }

  // --- 3. RUTA: LOGIN TRADICIONAL ---
  if (req.url.startsWith("/api/login") && req.method === "POST") {
    try {
      const { email, password } = req.body;
      const users = await getUsers();
      const userIndex = users.findIndex(
        (u) => u.email === email && u.password === password,
      );

      if (userIndex === -1) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Credenciales inválidas" }));
        return true;
      }

      users[userIndex].status = "online";
      await saveUsers(users);

      const loggedUser = { ...users[userIndex] };
      delete loggedUser.password;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Login exitoso", user: loggedUser }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno" }));
    }
    return true;
  }

  return false;
}

module.exports = handleAuthRoutes;
