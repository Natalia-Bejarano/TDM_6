const { getUsers, saveUsers } = require("../models/users");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
console.log("DEBUG - ID de Google:", process.env.GOOGLE_CLIENT_ID);
console.log(
  "DEBUG - Secreto de Google:",
  process.env.GOOGLE_CLIENT_SECRET ? "Cargado correctamente" : "No encontrado",
);
// Configuración del cliente de Google
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);
/**
 * Controlador de Autenticación - UCA
 * Soporta login tradicional y Google OAuth 2.0
 */
async function handleAuthRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- 1. RUTA: INICIAR LOGIN CON GOOGLE ---
  if (url.pathname === "/auth/google" && req.method === "GET") {
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
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
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verificamos el token y obtenemos los datos de Google
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload(); // Aquí está el email y nombre

      // Buscamos al usuario en nuestra "base de datos" (JSON)
      let users = await getUsers();
      let userIndex = users.findIndex((u) => u.email === payload.email);

      if (userIndex !== -1) {
        console.log(
          `✅ Google Match: Encontrado usuario ${users[userIndex].name} para el correo ${payload.email}`,
        );
      } else {
        console.warn(
          `❌ Google No-Match: El correo ${payload.email} no está en el JSON`,
        );
      }
      if (userIndex === -1) {
        // OPCIONAL: Si no existe, podrías crearlo aquí o lanzar error
        // Por ahora, redirigimos al login con un error
        res.writeHead(302, {
          // ELIMINAMOS 'HttpOnly'. Dejamos solo Path y Max-Age.
          "Set-Cookie": `loggedUser=${encodeURIComponent(JSON.stringify(loggedUser))}; Path=/; Max-Age=3600`,
          Location: "/chat.html",
        });
        res.end();
        return true;
      }

      // Login exitoso: Marcamos como online
      users[userIndex].status = "online";
      await saveUsers(users);

      const loggedUser = { ...users[userIndex] };
      delete loggedUser.password;

      // Enviamos el usuario al frontend mediante una Cookie temporal
      // (Porque una redirección 302 no permite enviar JSON en el cuerpo)
      res.writeHead(302, {
        "Set-Cookie": `loggedUser=${JSON.stringify(loggedUser)}; Path=/; Max-Age=3600`,
        Location: "/chat.html",
      });
      res.end();
    } catch (err) {
      console.error("Error en Callback de Google:", err);
      res.writeHead(302, { Location: "/login.html?error=auth_failed" });
      res.end();
    }
    return true;
  }

  // --- 3. RUTA: LOGIN TRADICIONAL (Tu código original) ---
  if (req.url.startsWith("/api/login") && req.method === "POST") {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email y contraseña requeridos" }));
        return true;
      }

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
      console.error("Error en módulo de Autenticación:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno del servidor" }));
    }
    return true;
  }

  return false;
}

module.exports = handleAuthRoutes;
