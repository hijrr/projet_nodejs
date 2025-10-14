const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔌 Connexion à AlwaysData
const db = mysql.createConnection({
  host: "mysql-bassourahma.alwaysdata.net", // remplace par ton vrai hôte
  user: "406339",                      // ton identifiant AlwaysData
  password: "Rourou_18",       // ton mot de passe
  database: "bassourahma_12"           // ton nom de base
});

// Vérification de la connexion
db.connect((err) => {
  if (err) {
    console.error("Erreur de connexion :", err);
  } else {
    console.log("✅ Connecté à la base AlwaysData !");
  }
});

// Exemple de route pour tester
app.get("/api/utilisateurs", (req, res) => {
  db.query("SELECT * FROM utilisateur", (err, results) => {
    if (err) {
      res.status(500).json({ error: "Erreur dans la requête SQL" });
    } else {
      res.json(results);
    }
  });
});

app.listen(5000, () => {
  console.log("🚀 Serveur Node.js sur http://localhost:5000");
});
