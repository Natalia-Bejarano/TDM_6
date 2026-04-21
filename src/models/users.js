const fs = require("fs/promises");
const path = require("path");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

/**
 * Lee el archivo JSON y devuelve solo el array de usuarios.
 */
async function getUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf8");
    const json = JSON.parse(data);
    // Retornamos el array contenido en la propiedad "users"
    return json.users || [];
  } catch (error) {
    console.error("Error leyendo usuarios:", error);
    return [];
  }
}

/**
 * Recibe el array de usuarios y lo guarda envuelto en el objeto principal.
 */
async function saveUsers(usersArray) {
  try {
    const dataToSave = {
      users: usersArray,
    };
    await fs.writeFile(USERS_FILE, JSON.stringify(dataToSave, null, 2));
    return true;
  } catch (error) {
    console.error("Error guardando usuarios:", error);
    return false;
  }
}

module.exports = { getUsers, saveUsers };

