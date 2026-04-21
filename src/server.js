/**
 * Servidor Principal - Universidad Católica Americana (UCA)
 * Punto de entrada central que integra protocolos HTTP y WebSocket.
 */
const { getUsers, saveUsers } = require("./models/users"); // Asegúrate de importar estas
const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const WebSocket = require("ws");

// Importación de controladores de rutas para la API
const handleUsersRoutes = require("./routes/users");
const handleAuthRoutes = require("./routes/auth");

// Inicializador de la lógica de comunicación en tiempo real (WebSocket)
const setupChat = require("./web/chat");

// Configuración de constantes de entorno y rutas de archivos
const PORT = 3000;
const PUBLIC_PATH = path.join(__dirname, "..", "public");

// Diccionario de tipos MIME para la correcta interpretación de archivos en el cliente
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Procesa el cuerpo de las peticiones POST/PUT (Middleware nativo)
 * Transforma los flujos de datos recibidos en objetos JSON.
 */
const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", (err) => reject(err));
  });
};

/**
 * Definición del servidor HTTP
 * Orquestador de peticiones dinámicas (API) y entrega de activos estáticos.
 */
const server = http.createServer(async (req, res) => {
  // Logger institucional: registro de actividad en tiempo real
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  try {
    // Extracción de datos para métodos que requieren escritura (POST/PUT)
    if (req.method === "POST" || req.method === "PUT") {
      req.body = await getRequestBody(req);
    }

    // --- ENRUTAMIENTO DE LA API ---
    // Se evalúan antes que los archivos estáticos para priorizar la lógica de negocio
    if (await handleAuthRoutes(req, res)) return;
    if (await handleUsersRoutes(req, res)) return;

    // --- GESTIÓN DE ARCHIVOS ESTÁTICOS (FRONTEND) ---
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname =
      parsedUrl.pathname === "/" ? "/login.html" : parsedUrl.pathname;
    const ext = path.extname(pathname);
    const fullPath = path.join(PUBLIC_PATH, pathname);

    // Identificación y entrega del recurso solicitado
    const contentType = MIME_TYPES[ext] || "text/plain";
    const content = await fs.readFile(fullPath);

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (err) {
    // Control de excepciones: Errores 404 (No encontrado) o 500 (Interno)
    if (err.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 - Archivo no encontrado");
    } else {
      console.error("Error crítico en el servidor:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`500 - Error Interno del Servidor: ${err.message}`);
    }
  }
});

/**
 * Inicialización del Servidor WebSocket (WSS)
 * Se vincula al mismo servidor HTTP para compartir puerto y protocolos.
 */
const wss = new WebSocket.Server({ server });
setupChat(wss);

async function initializeDatabase() {
  try {
    const users = await getUsers();
    const cleanUsers = users.map((u) => ({ ...u, status: "offline" }));
    await saveUsers(cleanUsers);
    console.log("✔️ Estados de presencia reiniciados exitosamente.");
  } catch (err) {
    console.error("❌ Fallo en la inicialización de base de datos:", err);
  }
}

// Inicializar y luego encender el servidor
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(
      `🚀 Sistema Institucional UCA activo en http://localhost:${PORT}`,
    );
  });
});
