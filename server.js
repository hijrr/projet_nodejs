const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
<<<<<<< HEAD
const app = express();//logicil serveur
const multer = require('multer');
const path = require('path');
const fs = require('fs');
=======
const app = express(); //logicil serveur
>>>>>>> 7acc620 (api nombre annonce active et inactive)
app.use(cors());
app.use(express.json()); //permet serveur de comprendre les fichiers json de front-end
// Connexion à la base de données AlwaysData
const db = mysql.createConnection({
  host: "mysql-bassourahma.alwaysdata.net",
  user: "406339",
  password: "Rourou_18",
  database: "bassourahma_12",
});
db.connect((err) => {
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

// Route pour récupérer les infos de l'utilisateur connecté
app.get("/api/utilisateur/connecte/:userId", (req, res) => {
  const userId = req.params.userId;

  // Vérification basique
  if (!userId) {
    return res.status(400).json({ message: "userId manquant dans la requête" });
  }

  const sql = "SELECT * FROM utilisateur WHERE userId = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("❌ Erreur MySQL :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // ✅ Retourne les infos de l'utilisateur connecté
    res.status(200).json(result[0]);
  });
});



// --- Mettre à jour le profil utilisateur ---
app.put("/api/user/:id", (req, res) => {
  const userId = req.params.id;
  const { nom, prénom, email, motDePasse, telephone } = req.body;

  const sql = "UPDATE utilisateur SET nom = ?, `prénom` = ?, email = ?, motDePasse = ?, telephone = ? WHERE userId = ?";
  
  db.query(sql, [nom, prénom, email, motDePasse, telephone, userId], (err, result) => {
    if (err) {
      console.error("Erreur MySQL :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Profil mis à jour avec succès !" });
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
app.get("/get/3dernierAnnonces", (req, res) => {
  db.query(
    "select * from annonce order by  dateCreation DESC limit 3",
    (err, results) => {
      if (err) {
        console.error("Erreur requête :", err);
        return res.status(500).json(err);
      }
      console.log("✅ Résultat de la requête :", results);
      res.json(results);
    }
  );
});

//  Get nombre des annonces actives
app.get("/get/NombreAnnoncesActives", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS nombreAnnonceActive FROM annonce WHERE statu = 'ACTIVE'",
    (err, results) => {
      if (err) {
        console.error("❌ Erreur requête :", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      console.log("✅ Résultat de la requête :", results);
      const nombre = results[0].nombreAnnonceActive;
      res.json(nombre); // results[0] contient le nombre
    }
  );
});
// get nombre annonces inactives
app.get("/get/NombreAnnoncesINActives", (req, res) => {
  db.query(
    "SELECT COUNT(*) AS nombreAnnonceINActive FROM annonce WHERE statu = 'INACTIVE'",
    (err, results) => {
      if (err) {
        console.error("❌ Erreur requête :", err);
        return res.status(500).json({ error: "Erreur serveur" });
      }

      console.log("✅ Résultat de la requête :", results);
      res.json(results[0]); // results[0] contient le nombre
    }
  );
});
// POST ajouter une annonce
app.post("/annonces", (req, res) => {
  const { titre, description, prix, image, localisation, statu, userId } =
    req.body;

  if (!titre || !userId) {
    return res
      .status(400)
      .json({ message: "Le titre et l'userId sont requis !" });
  }

  const sql = `INSERT INTO annonce 
    (titre, description, prix, image, localisation, statu, userId) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [titre, description, prix, image, localisation, statu || "ACTIVE", userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res
        .status(201)
        .json({
          message: "Annonce ajoutée avec succès !",
          id: result.insertId,
        });
    }
  );
});

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const SECRET_KEY = "secret123";
// Middleware pour vérifier le token
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ msg: "Token manquant" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ msg: "Token invalide" });
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
    return res
      .status(400)
      .json({ message: "Tous les champs sont obligatoires !" });
  }

  // ✅ Vérifier que nom et prénom contiennent seulement des lettres
  const lettersRegex = /^[A-Za-z]+$/;
  if (!lettersRegex.test(nom) || !lettersRegex.test(prénom)) {
    return res
      .status(400)
      .json({
        message: "Nom et prénom doivent contenir uniquement des lettres.",
      });
  }

  // ✅ Vérifier que l'email contient '@'
  if (!email.includes("@")) {
    return res.status(400).json({ message: "Email invalide." });
  }

  // ✅ Vérifier le mot de passe
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(motDePasse)) {
    return res.status(400).json({
      message:
        "Mot de passe invalide. Il doit contenir au moins une majuscule, un chiffre et au moins 6 caractères.",
    });
  }

  // ✅ Vérifier le téléphone
  const phoneRegex = /^\d{8}$/;
  if (!phoneRegex.test(telephone)) {
    return res
      .status(400)
      .json({ message: "Téléphone invalide. Il doit contenir 8 chiffres." });
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

    db.query(
      sql,
      [nom, prénom, email, motDePasse, telephone, role],
      (err, result) => {
        if (err) {
          console.error("Erreur SQL complète :", err);
          return res
            .status(500)
            .json({ message: "Erreur serveur", error: err });
        }
        res
          .status(201)
          .json({
            message: "Utilisateur enregistré avec succès !",
            userId: result.insertId,
          });
      }
    );
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
      return res
        .status(401)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    const user = results[0];
    res.status(200).json(user); // renvoie l'objet user
  });
});
// Récupérer infos utilisateur
app.get("/user", verifyToken, (req, res) => {
  const query =
    "SELECT userId, nom, prénom, email, telephone, role, dateInscri FROM utilisateur WHERE userId = ?";
  db.query(query, [req.userId], (err, results) => {
    if (err) return res.status(500).json({ msg: "Erreur serveur" });
    if (results.length === 0)
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    res.json(results[0]);
  });
});
// 📝 Ajouter une annonce (avec lien image)
app.post("/api/annonces", (req, res) => {
  const { titre, description, prix, image, localisation, type, duree, userId } =
    req.body;

  const sql = `
    INSERT INTO annonce (titre, description, prix, image, localisation, type, duree, userId, statu, dateCreation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW())
  `;

  db.query(
    sql,
    [titre, description, prix, image, localisation, type, duree, userId],
    (err, result) => {
      if (err) {
        console.error("Erreur SQL:", err);
        return res.status(500).json({ message: "Erreur d’ajout de l’annonce" });
      }
      res.status(201).json({ message: "Annonce ajoutée avec succès" });
    }
  );
});





//partie image profilee


// dossier uploads (crée le si n'existe pas)
const uploadDir = path.join('/home/rahma/projet_nodejs', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// config multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    // n'autorise que les images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seulement les images sont autorisées'));
    }
    cb(null, true);
  }
});

// rendre uploads accessible publiquement
app.use('/uploads', express.static(uploadDir));

// Ex: route pour uploader une image de profil
app.post('/api/upload/profile-image', upload.single('profileImage'), (req, res) => {
  const userId = req.body.userId; // ou extraire depuis token
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });

  const filename = req.file.filename;
  const imageUrl = `/uploads/${filename}`; // stocker ceci en DB

  // exemple avec MySQL (ajuste selon ta config)
  const sql = 'UPDATE utilisateur SET profileImage = ? WHERE userId = ?';
  db.query(sql, [imageUrl, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur DB' });
    }
    return res.json({ message: 'Image uploadée', imageUrl });
  });
});

const PORT = 5000;

app.listen(PORT, () => console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`));




app.get("/api/stats", async (req, res) => {
  try {
    const stats = {};

    // Compter le nombre d'utilisateurs
    db.query("SELECT COUNT(*) AS total FROM utilisateur", (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.utilisateurs = results[0].total;

      // Compter le nombre d'annonces
      db.query("SELECT COUNT(*) AS total FROM annonce", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.annonces = results[0].total;

        // Compter le nombre d'offres
        db.query("SELECT COUNT(*) AS total FROM offre", (err, results) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.offres = results[0].total;

          // Retourner toutes les statistiques
          res.json(stats);
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
});

app.get('/api/activities', (req, res) => {
  const sql = `
    SELECT 'annonce' AS type, titre AS nom, dateCreation AS date 
    FROM annonce
    UNION
    SELECT 'offre' AS type, titre AS nom, dateCreation AS date 
    FROM offre
    UNION
    SELECT 'paiement' AS type, CONCAT('Paiement de ', montant, ' DT') AS nom, datePaiement AS date 
    FROM paiement
    ORDER BY date DESC
    LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error('Erreur lors de la récupération des activités :', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    res.json(result);
  });
});


// ✅ Récupérer tous les utilisateurs
app.get("/api/utilisateurs", (req, res) => {
  const sql = "SELECT * FROM utilisateur";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur de récupération :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(results);
  });
});

// ✅ Modifier le rôle d’un utilisateur
app.put("/api/utilisateurs/:id/role", (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  const sql = "UPDATE utilisateur SET role = ? WHERE userId = ?";
  db.query(sql, [role, userId], (err, result) => {
    if (err) {
      console.error("Erreur de mise à jour :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json({ message: "Rôle mis à jour avec succès" });
  });
});

/* 📦 1. Récupérer toutes les annonces avec le nom de l'utilisateur */
app.get("/GAnnonces", (req, res) => {
  const sql = `
    SELECT a.*, u.nom, u.prénom 
    FROM annonce a
    LEFT JOIN utilisateur u ON a.userId = u.userId
    ORDER BY a.dateCreation DESC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erreur lors de la récupération :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(result);
  });
});

/* ✏️ 2. Modifier le statut d'une annonce */
app.put("/annonces/:id", (req, res) => {
  const { id } = req.params;
  const { statu } = req.body;

  const sql = "UPDATE annonce SET statu = ? WHERE idAnnonce = ?";
  db.query(sql, [statu, id], (err, result) => {
    if (err) {
      console.error("Erreur update :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json({ message: "Statut modifié avec succès" });
  });
});

/* 🗑️ 3. Supprimer une annonce */
app.delete("/annonces/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM annonce WHERE idAnnonce = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erreur suppression :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json({ message: "Annonce supprimée avec succès" });
  });
});
=======
app.listen(PORT, () =>
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`)
);
>>>>>>> 7acc620 (api nombre annonce active et inactive)
