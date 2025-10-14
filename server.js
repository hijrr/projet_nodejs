const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
// Connexion à la base de données AlwaysData
const db = mysql.createConnection({
  host: 'mysql-bassourahma.alwaysdata.net',
  user: '406339',
  password: 'Rourou_18',
  database: 'bassourahma_12'
});

db.connect(err => {
  if (err) console.error("Erreur DB:", err);
  else console.log("✅ Connecté à la DB AlwaysData !");
});

// Exemple d'API pour récupérer les données
app.get("/clients", (req, res) => {
  db.query("SELECT * FROM utilisateur", (err, results) => {
    if (err) {
      console.error("Erreur requête :", err);
      return res.status(500).json(err);
    }
    console.log("✅ Résultat de la requête :", results);
    res.json(results);
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));