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
app.get("/getAnnonces", (req, res) => {
  db.query("SELECT * FROM annonce", (err, results) => {
    if (err) {
      console.error("Erreur requête :", err);
      return res.status(500).json(err);
    }
    console.log("✅ Résultat de la requête :", results);
    res.json(results);
  });
});
// POST ajouter une annonce
app.post("/annonces", (req, res) => {
  const { titre, description, prix, image, localisation, statu, userId } = req.body;

  if (!titre || !userId) {
    return res.status(400).json({ message: "Le titre et l'userId sont requis !" });
  }

  const sql = `INSERT INTO annonce 
    (titre, description, prix, image, localisation, statu, userId) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [titre, description, prix, image, localisation, statu || 'ACTIVE', userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.status(201).json({ message: "Annonce ajoutée avec succès !", id: result.insertId });
  });
});
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));