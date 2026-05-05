const { getUsers, saveUsers } = require("../models/users");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// Definimos la ruta de la imagen por defecto como una constante para no cometer errores
const DEFAULT_IMAGE = "/resources/default.png";

async function handleAuthRoutes(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- 1. RUTA: INICIAR LOGIN CON GOOGLE ---
  if (url.pathname === "/auth/google" && req.method === "GET") {
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      prompt: "select_account",
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

      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      const { email, name, picture } = payload;

      let users = await getUsers();
      let userIndex = users.findIndex((u) => u.email === email);

      // Decidimos qué imagen usar: la de Google o la nuestra por defecto
      // Si 'picture' no existe o es una de esas URLs genéricas de Google, usamos la nuestra
      const finalPicture =
        picture && picture.includes("googleusercontent.com")
          ? picture
          : DEFAULT_IMAGE;

      if (userIndex === -1) {
        // --- CASO A: Registro de nuevo estudiante ---
        console.log(`✨ Registrando nuevo usuario: ${name}`);

        const newUser = {
          id: `S${Date.now()}`,
          name: name,
          email: email,
          img: finalPicture, // Usamos la imagen validada
          rol: "student",
          status: "online",
          faculty: "Ingeniería de Sistemas",
          studentID: `UCA-${Math.floor(10000 + Math.random() * 90000)}`,
          attended: false,
        };

        users.push(newUser);
        await saveUsers(users);
        userIndex = users.length - 1;
      } else {
        // --- CASO B: Usuario ya existente ---
        console.log(`✅ Bienvenido de nuevo: ${users[userIndex].name}`);

        users[userIndex].name = name;

        // Solo actualizamos la imagen si la de Google es válida
        // Si el usuario ya tenía una foto local personalizada, no la borramos
        if (picture && picture.includes("googleusercontent.com")) {
          users[userIndex].img = picture;
        } else if (!users[userIndex].img) {
          // Si no tiene ninguna, le ponemos la de defecto
          users[userIndex].img = DEFAULT_IMAGE;
        }

        users[userIndex].status = "online";
        await saveUsers(users);
      }

      const loggedUser = { ...users[userIndex] };
      delete loggedUser.password;

      const cookieData = encodeURIComponent(JSON.stringify(loggedUser));

      res.writeHead(302, {
        "Set-Cookie": `loggedUser=${cookieData}; Path=/; Max-Age=3600`,
        Location: "/chat.html",
      });
      res.end();
    } catch (err) {
      console.error("❌ Error en Callback de Google:", err.message);
      res.writeHead(302, { Location: "/login.html?error=google_auth_failed" });
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
