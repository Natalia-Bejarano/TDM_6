const { getUsers, saveUsers } = require("../models/users");
const url = require("url");

/**
 * Enrutador de Usuarios (API CRUD)
 * Gestiona las operaciones de lectura, creación y eliminación de la base de datos local.
 */
async function handleUsersRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Filtrado de peticiones dirigidas al endpoint /api/users
  if (pathname.startsWith("/api/users")) {
    const method = req.method;
    const parts = pathname.split("/").filter(Boolean);
    const id = parts[2] || null;

    try {
      // ENDPOINT: Listado de usuarios (Soporta filtrado opcional por rol)
      if (method === "GET" && parts.length === 2) {
        let users = await getUsers();

        // Aplicación de filtro por query params (ej: ?rol=monitor)
        const roleFilter = parsedUrl.query.rol;
        if (roleFilter) {
          users = users.filter((u) => u.rol === roleFilter);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(users));
        return true;
      }

      // ENDPOINT: Búsqueda de un usuario específico por ID
      if (method === "GET" && parts.length === 3 && id) {
        const users = await getUsers();
        const user = users.find((u) => u.id === id);

        if (!user) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Usuario UCA no encontrado" }));
          return true;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(user));
        return true;
      }

      // ENDPOINT: Registro de nuevos integrantes (POST)
      if (method === "POST" && parts.length === 2) {
        const { name, password, email, rol } = req.body;

        // Validación de campos obligatorios
        if (!name || !password || !email) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Datos institucionales incompletos" }),
          );
          return true;
        }

        const users = await getUsers();

        // Lógica de Negocio: Generación de IDs institucionales basados en el rol
        const newUser = {
          id:
            rol === "monitor"
              ? `M00${users.length + 1}`
              : `S00${users.length + 1}`,
          name,
          password,
          email,
          rol: rol || "student",
          img: req.body.img || "img/default.jpg",
          specialty: req.body.specialty || null,
          faculty: req.body.faculty || null,
          studentID: req.body.studentID || null,
          status: "offline",
        };

        // Persistencia del nuevo registro
        users.push(newUser);
        await saveUsers(users);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(newUser));
        return true;
      }

      // ENDPOINT: Eliminación de registros (DELETE)
      if (method === "DELETE" && parts.length === 3 && id) {
        const users = await getUsers();
        const filteredUsers = users.filter((u) => u.id !== id);

        // Verificación de existencia antes de eliminar
        if (filteredUsers.length === users.length) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Usuario no existe" }));
          return true;
        }

        await saveUsers(filteredUsers);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Registro eliminado" }));
        return true;
      }
    } catch (err) {
      // Captura de errores en el procesamiento de datos
      console.error("Error en módulo Users:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Error interno procesando usuarios" }));
      return true;
    }
  }

  return false; // Ruta no manejada por este controlador
}

module.exports = handleUsersRoutes;
