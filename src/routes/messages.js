const { getMessages } = require("../models/messages");
const url = require("url");

async function handleMessageRoutes(req, res) {
  const parsedUrl = url.parse(req.url, true);

  // GET /api/messages?userId=S001&contactId=M002
  if (parsedUrl.pathname === "/api/messages" && req.method === "GET") {
    const { userId, contactId } = parsedUrl.query;
    const allMessages = await getMessages();

    // Filtramos: Mensajes de A para B O mensajes de B para A
    const chatHistory = allMessages.filter(
      (m) =>
        (m.from === userId && m.to === contactId) ||
        (m.from === contactId && m.to === userId),
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(chatHistory));
    return true;
  }
  return false;
}

module.exports = handleMessageRoutes;
