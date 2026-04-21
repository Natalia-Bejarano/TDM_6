const { getUsers, saveUsers } = require("../models/users");

/**
 * Controlador de Autenticación
 * Gestiona el inicio de sesión y la actualización del estado de los usuarios.
 */
async function handleAuthRoutes(req, res) {
  // Verificación de endpoint y método HTTP para inicio de sesión
  if (req.url.startsWith("/api/login") && req.method === "POST") {
    try {
      // Extracción de credenciales procesadas previamente por el servidor
      const { email, password } = req.body;

      // Validación de integridad de los datos de entrada
      if (!email || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email y contraseña requeridos" }));
        return true;
      }

      // Consulta de la base de datos local (JSON)
      const users = await getUsers();

      // Búsqueda del índice del usuario mediante comparación de credenciales
      const userIndex = users.findIndex(
        (u) => u.email === email && u.password === password,
      );

      // Manejo de error en caso de credenciales inválidas
      if (userIndex === -1) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Credenciales inválidas" }));
        return true;
      }

      // Actualización de estado: El usuario pasa a estar 'online'
      users[userIndex].status = "online";

      // Persistencia del cambio de estado en el archivo JSON
      await saveUsers(users);

      // Sanitización del objeto: Se elimina la contraseña por seguridad antes del envío
      const loggedUser = { ...users[userIndex] };
      delete loggedUser.password;

      // Respuesta exitosa con la información del perfil del usuario
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Login exitoso",
          user: loggedUser,
        }),
      );
    } catch (err) {
      // Gestión de errores internos del servidor
      console.error("Error en módulo de Autenticación:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno del servidor" }));
    }
    return true; // Indica que la petición fue procesada por este controlador
  }

  return false; // El controlador ignora peticiones que no correspondan a su ruta
}

module.exports = handleAuthRoutes;
