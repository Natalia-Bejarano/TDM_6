# Sistema de Chat Institucional - UCA

Este proyecto es una plataforma de mensajería privada en tiempo real diseñada para la comunicación entre estudiantes y monitores de la Universidad Católica Americana.

## Cómo inicializar el proyecto

1. **Instalación de dependencias:**  
   Bash

```
npm install
```

1. **Iniciar el servidor**:
   Bash

```
node src/server.js
```

## Organización del proyecto

El proyecto sigue una arquitectura modular para separar la lógica de negocio de la interfaz:

- **/src**: Núcleo del servidor (Backend).
  - **/models**: Gestión de datos y persistencia (Archivos JSON).
  - **/routes**: Endpoints de la API para Autenticación y Usuarios.
  - **/web**: Lógica de WebSockets para gestión de presencia y mensajes.
  - **/utils**: Herramientas de red y lógica de transmisión (Messaging).

- **/public**: Activos del cliente (Frontend).
  - **/css**: Estilos organizados por componentes (Sidebar, Chat, Global).
  - **/js**: Controladores de la interfaz y lógica de conexión al socket.

## Tecnologías utilizadas

**Backend**: Node.js (Servidor HTTP nativo).

**Comunicación**: WebSockets (Librería ws).

**Frontend**: JavaScript, CSS3 y HTML5.
