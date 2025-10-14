const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bienvenue sur ton serveur Node.js 🚀");
});

server.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});