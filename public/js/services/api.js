/**
 * Servicios de comunicación con la API institucional (UCA)
 * Este módulo abstrae las peticiones HTTP mediante 'fetch'.
 */

// Autentica al usuario enviando credenciales al servidor
export const login = async (email, password) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  // Manejo de errores basado en la respuesta del servidor
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error en el login");
  }
  return await response.json();
};

// Obtiene el directorio de usuarios, permite filtrado opcional por rol
export const getUsers = async (role = null) => {
  let url = "/api/users";
  if (role) url += `?rol=${role}`;

  const response = await fetch(url);
  return await response.json();
};

// Recupera la información detallada de un usuario por su ID
export const getUserById = async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return await response.json();
};
