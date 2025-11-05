const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();//logicil serveur
app.use(cors());
app.use(express.json());//permet serveur de comprendre les fichiers json de front-end
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
//api get les 3 dernier annonce avec date 
app.get("/get/3dernierAnnonces",(req,res)=>{
  db.query("select * from annonce order by  dateCreation DESC limit 3",(err,results)=>{
    if(err){
        console.error("Erreur requête :", err);
       return res.status(500).json(err);
      
    }
      console.log("✅ Résultat de la requête :", results);
       res.json(results); 
  })
}
);

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



const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET_KEY = 'secret123';
// Middleware pour vérifier le token
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ msg: 'Token manquant' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ msg: 'Token invalide' });
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  });
}
app.post("/register", (req, res) => {
  const { nom, prénom, email, motDePasse, telephone, role } = req.body;
  console.log("Données reçues pour register :", req.body);

  // ✅ Vérifier que tous les champs sont fournis
  if (!nom || !prénom || !email || !motDePasse || !telephone || !role) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires !" });
  }

  // ✅ Vérifier que nom et prénom contiennent seulement des lettres
  const lettersRegex = /^[A-Za-z]+$/;
  if (!lettersRegex.test(nom) || !lettersRegex.test(prénom)) {
    return res.status(400).json({ message: "Nom et prénom doivent contenir uniquement des lettres." });
  }

  // ✅ Vérifier que l'email contient '@'
  if (!email.includes("@")) {
    return res.status(400).json({ message: "Email invalide." });
  }

  // ✅ Vérifier le mot de passe
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(motDePasse)) {
    return res.status(400).json({ 
      message: "Mot de passe invalide. Il doit contenir au moins une majuscule, un chiffre et au moins 6 caractères." 
    });
  }

  // ✅ Vérifier le téléphone
  const phoneRegex = /^\d{8}$/;
  if (!phoneRegex.test(telephone)) {
    return res.status(400).json({ message: "Téléphone invalide. Il doit contenir 8 chiffres." });
  }

  // ✅ Vérifier que l'email est unique dans la base
  const checkEmailSql = "SELECT * FROM utilisateur WHERE email = ?";
  db.query(checkEmailSql, [email], (err, results) => {
    if (err) {
      console.error("Erreur SQL lors de la vérification de l'email :", err);
      return res.status(500).json({ message: "Erreur serveur", error: err });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    // ✅ Insérer l'utilisateur
    const sql = `
      INSERT INTO utilisateur (nom, prénom, email, motDePasse, telephone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nom, prénom, email, motDePasse, telephone, role], (err, result) => {
      if (err) {
        console.error("Erreur SQL complète :", err);
        return res.status(500).json({ message: "Erreur serveur", error: err });
      }
      res.status(201).json({ message: "Utilisateur enregistré avec succès !", userId: result.insertId });
    });
  });
});



// Route POST login
app.post("/login", (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  const sql = "SELECT * FROM utilisateur WHERE email = ? AND motDePasse = ?";
  db.query(sql, [email, motDePasse], (err, results) => {
    if (err) {
      console.error("Erreur SQL:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const user = results[0];
    res.status(200).json(user); // renvoie l'objet user
  });
});
// Récupérer infos utilisateur
app.get('/user', verifyToken, (req, res) => {
  const query = "SELECT userId, nom, prénom, email, telephone, role, dateInscri FROM utilisateur WHERE userId = ?";
  db.query(query, [req.userId], (err, results) => {
    if (err) return res.status(500).json({ msg: 'Erreur serveur' });
    if (results.length === 0) return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    res.json(results[0]);
  });
});
// 📝 Ajouter une annonce (avec lien image)
app.post("/api/annonces", (req, res) => {
  const { titre, description, prix, image, localisation, type, duree, userId } = req.body;

  const sql = `
    INSERT INTO annonce (titre, description, prix, image, localisation, type, duree, userId, statu, dateCreation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())
  `;

  db.query(sql, [titre, description, prix, image, localisation, type, duree, userId], (err, result) => {
    if (err) {
      console.error("Erreur SQL:", err);
      return res.status(500).json({ message: "Erreur d’ajout de l’annonce" });
    }
    res.status(201).json({ message: "Annonce ajoutée avec succès" });
  });
});
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));