const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();//logicil serveur
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

  const sql =
    "UPDATE utilisateur SET nom = ?, `prénom` = ?, email = ?, motDePasse = ?, telephone = ? WHERE userId = ?";

  db.query(
    sql,
    [nom, prénom, email, motDePasse, telephone, userId],
    (err, result) => {
      if (err) {
        console.error("Erreur MySQL :", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      res.json({ message: "Profil mis à jour avec succès !" });
    }
  );
});

// 2. Récupérer les détails d’une annonce par ID
app.get("/api/annonces/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT a.*, u.* FROM annonce a JOIN utilisateur u ON a.userId = u.userId WHERE a.idAnnonce = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: "Annonce non trouvée" });
    res.json(results[0]);
  });
});


// 3. Ajouter une annonce aux favoris
app.post("/api/favoris", (req, res) => {
  const { idAnnonce, userId } = req.body;

  if (!idAnnonce || !userId) {
    return res.status(400).json({ message: "idAnnonce et userId sont requis" });
  }

  // Vérifier si le favori existe déjà
  const checkSql = "SELECT idFav FROM annonce_favorise WHERE idAnnonce = ? AND userId = ?";
  db.query(checkSql, [idAnnonce, userId], (err, results) => {
    if (err) {
      console.error("Erreur SQL check :", err);
      return res.status(500).json({ message: "Erreur serveur", error: err.message });
    }

    if (results.length > 0) {
      // Le favori existe déjà
      return res.status(200).json({ message: "Annonce déjà en favoris", idFav: results[0].idFav });
    }

    // Sinon, on ajoute le favori
    const insertSql = "INSERT INTO annonce_favorise (idAnnonce, userId, dateAjout) VALUES (?, ?, NOW())";
    db.query(insertSql, [idAnnonce, userId], (err, result) => {
      if (err) {
        console.error("Erreur SQL insert :", err);
        return res.status(500).json({ message: "Erreur serveur", error: err.message });
      }

      res.status(201).json({ message: "Ajouté aux favoris", idFav: result.insertId });
    });
  });
});



// 5. Supprimer une annonce des favoris
app.delete("/api/favoris/:idFav", (req, res) => {
  const { idFav } = req.params;
  const sql = "DELETE FROM annonce_favorise WHERE idFav = ?";
  db.query(sql, [idFav], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Supprimé des favoris" });
  });
});

// Vérifier si l'annonce est déjà dans les favoris pour l'utilisateur
app.get("/api/favoris/check", (req, res) => {
  const { idAnnonce, userId } = req.query;
  const sql = "SELECT idFav FROM annonce_favorise WHERE idAnnonce = ? AND userId = ?";
  db.query(sql, [idAnnonce, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length > 0) return res.json({ idFav: results[0].idFav });
    res.json({ idFav: null });
  });
});

// 4. Récupérer les favoris d’un utilisateur
// backend - route pour récupérer les favoris d'un utilisateur
app.get("/api/favoris/:userId", (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId manquant" });
  }

  const sql = `
    SELECT af.idFav, af.idAnnonce, af.dateAjout, a.titre, a.prix, a.type, a.localisation, a.image
    FROM annonce_favorise af
    JOIN annonce a ON af.idAnnonce = a.idAnnonce
    WHERE af.userId = ?`;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erreur SQL favoris :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des favoris" });
    }

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
app.get("/get/NombreAnnoncesActives/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT COUNT(*) AS nombreAnnonceActive FROM annonce WHERE statu = 'ACTIVE' AND userId = ?",
    [userId],
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
// get nombre annonces inactives
app.get("/get/NombreAnnoncesINActives/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT COUNT(*) AS nombreAnnonceINActive FROM annonce WHERE statu = 'INACTIVE' AND userId=?",
    [userId],
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
// Get nombre demandes de clients pour un utilisateur spécifique
app.get("/get/NombrdemandeClients/:userId", (req, res) => {
  const userId = req.params.userId;

  db.query(
    `SELECT COUNT(*) AS nombdemandesclinets 
     FROM demandeloc d 
     INNER JOIN annonce a ON d.annonceId = a.idAnnonce
     WHERE a.userId = ?`,
    [userId],
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
//api pour gere demmande clients
// Get toutes les demandes pour un propriétaire
// Get toutes les demandes pour un propriétaire
// Get toutes les demandes pour un propriétaire
app.get("/get/demandes/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT 
      d.idDem,
      d.dateDem,
      d.datedebut,
      d.dateFin,
      d.userId as clientId,
      d.annonceId,
      d.statut as demande_statut,
      a.titre as annonce_titre,
      a.prix as annonce_prix,
      a.localisation,
      a.type,
      a.duree,
      u.nom as client_nom,
      u.prénom as client_prenom,
      u.email as client_email,
      u.telephone as client_telephone
    FROM demandeloc d
    INNER JOIN annonce a ON d.annonceId = a.idAnnonce
    INNER JOIN utilisateur u ON d.userId = u.userId
    WHERE a.userId = ?
    ORDER BY d.dateDem DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erreur récupération demandes:", err);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    console.log("✅ Demandes récupérées:", results.length);
    res.json(results);
  });
});
// get nombre des paiments effecutes
app.get("/get/nombrepaimenteffecute/:id", (req, res) => {
  const userId = req.params.userId;
  db.query(
    "SELECT COUNT(*) AS nombrepaimenteffecute FROM paiment WHERE userId=?",
    [userId],
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
      res.status(201).json({
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
    return res.status(400).json({
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
        res.status(201).json({
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INACTIVE', NOW())
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

const path1 = require("path");
const fs1 = require("fs");
const multer1 = require("multer");

// Configuration du dossier pour les annonces
const uploadsAnnonceDir = path1.join(__dirname, "uploadsAnnonce");

// Créer le dossier s'il n'existe pas
if (!fs1.existsSync(uploadsAnnonceDir)) {
  fs1.mkdirSync(uploadsAnnonceDir, { recursive: true });
}

// Configuration Multer pour les annonces
const annonceUpload = multer1({
  storage: multer1.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsAnnonceDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "annonce-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Servir les fichiers statiques des annonces
app.use("/uploadsAnnonce", express.static(uploadsAnnonceDir));

// Route pour uploader une image d'annonce
app.post(
  "/api/upload/annonce-image",
  annonceUpload.single("annonceImage"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier uploadé" });
      }

      const filename = req.file.filename;
      // Utiliser l'URL complète pour l'affichage
      const imageUrl = `http://localhost:5000/uploadsAnnonce/${filename}`;

      console.log("Fichier uploadé:", {
        filename: filename,
        path: req.file.path,
        url: imageUrl,
      });

      return res.json({
        message: "Image uploadée avec succès",
        imageUrl: imageUrl,
        filename: filename,
      });
    } catch (error) {
      console.error("Erreur upload:", error);
      return res.status(500).json({ error: "Erreur lors de l'upload" });
    }
  }
);

// Route pour créer l'annonce
app.post("/api/annonces", (req, res) => {
  const { titre, description, prix, image, localisation, type, duree, userId } =
    req.body;

  console.log("Données reçues pour annonce:", {
    titre,
    prix,
    image,
    userId,
  });

  const sql = `
    INSERT INTO annonce (titre, description, prix, image, localisation, type, duree, userId, statu, dateCreation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INACTIVE', NOW())
  `;

  db.query(
    sql,
    [titre, description, prix, image, localisation, type, duree, userId],
    (err, result) => {
      if (err) {
        console.error("Erreur SQL:", err);
        return res.status(500).json({ message: "Erreur d'ajout de l'annonce" });
      }
      res.status(201).json({
        message: "Annonce ajoutée avec succès",
        annonceId: result.insertId,
      });
    }
  );
});

//partie image profilee


// dossier uploads (crée le si n'existe pas)
/* const uploadDir = path.join(
  "/home/achwak/projetdariTn/projet_nodejs",
  "uploads"
); */

// eye:  const uploadDir = path.join(__dirname, "uploads");
const uploadDir = path.join(__dirname, "uploads");
// dossier uploads (crée le si n'existe pas)


if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// config multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    // n'autorise que les images
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Seulement les images sont autorisées"));
    }
    cb(null, true);
  },
});

// rendre uploads accessible publiquement

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Ex: route pour uploader une image de profil
app.post(
  "/api/upload/profile-image",
  upload.single("profileImage"),
  (req, res) => {
    const userId = req.body.userId; // ou extraire depuis token
    if (!req.file) return res.status(400).json({ error: "Aucun fichier" });

    const filename = req.file.filename;
    const imageUrl = `/uploads/${filename}`; // stocker ceci en DB

    // exemple avec MySQL (ajuste selon ta config)
    const sql = "UPDATE utilisateur SET profileImage = ? WHERE userId = ?";
    db.query(sql, [imageUrl, userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur DB" });
      }
      return res.json({ message: "Image uploadée", imageUrl });
    });
  }
);

const PORT = 5000;



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

app.get("/api/activities", (req, res) => {
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
      console.error("Erreur lors de la récupération des activités :", err);
      return res.status(500).json({ error: "Erreur serveur" });
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
app.delete("/annoncesDelite/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM annonce WHERE idAnnonce = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erreur suppression :", err);

      // Cas particulier : violation de contrainte de clé étrangère
      if (err.errno === 1451) {
        return res.status(400).json({
          message:
            "Impossible de supprimer cette annonce car elle est liée à une ou plusieurs demandes de location.",
        });
      }

      // Autres erreurs
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    res.json({ message: "Annonce supprimée avec succès" });
  });
});


// Route pour supprimer une annonce
app.delete("/api/annonces/:id", (req, res) => {
  const annonceId = req.params.id;

  console.log("Suppression annonce ID:", annonceId);

  const sql = "DELETE FROM annonce WHERE idAnnonce = ?";

  db.query(sql, [annonceId], (err, result) => {
    if (err) {
      console.error("Erreur SQL suppression:", err);
      return res
        .status(500)
        .json({ message: "Erreur lors de la suppression de l'annonce" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    res.json({
      message: "Annonce supprimée avec succès",
      annonceId: annonceId,
    });
  });
});
// Route pour récupérer une annonce spécifique
app.get("/api/annonces/:id", (req, res) => {
  const annonceId = req.params.id;

  console.log("Récupération annonce ID:", annonceId);

  const sql = "SELECT * FROM annonce WHERE idAnnonce = ?";

  db.query(sql, [annonceId], (err, result) => {
    if (err) {
      console.error("Erreur SQL:", err);
      return res
        .status(500)
        .json({ message: "Erreur de récupération de l'annonce" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    res.json(result[0]);
  });
});

// Route pour modifier une annonce - CORRIGÉE
app.put("/api/annonces/:id", (req, res) => {
  const annonceId = req.params.id;
  const { titre, description, prix, image, localisation, type, duree, userId } =
    req.body;

  console.log("Données reçues pour modification annonce:", {
    annonceId,
    titre,
    prix,
    image,
    userId,
  });

  // Vérifier que l'annonce existe et que l'utilisateur est propriétaire
  const checkSql = "SELECT userId FROM annonce WHERE idAnnonce = ?";

  db.query(checkSql, [annonceId], (err, result) => {
    if (err) {
      console.error("Erreur SQL:", err);
      return res.status(500).json({ message: "Erreur de vérification" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Annonce non trouvée" });
    }

    if (result[0].userId != userId) {
      return res
        .status(403)
        .json({ message: "Non autorisé à modifier cette annonce" });
    }

    // Mettre à jour l'annonce - SUPPRIMER dateModification
    const updateSql = `
      UPDATE annonce 
      SET titre = ?, description = ?, prix = ?, image = ?, 
          localisation = ?, type = ?, duree = ?
      WHERE idAnnonce = ?
    `;

    db.query(
      updateSql,
      [titre, description, prix, image, localisation, type, duree, annonceId],
      (err, result) => {
        if (err) {
          console.error("Erreur SQL:", err);
          return res
            .status(500)
            .json({ message: "Erreur de modification de l'annonce" });
        }

        console.log("Annonce modifiée avec succès:", result);

        res.json({
          message: "Annonce modifiée avec succès",
          annonceId: annonceId,
        });
      }
    );
  });
});
const path2 = require("path");
const fs2 = require("fs");
const multer2 = require("multer");

// Configuration du dossier pour les annonces
const uploadsAnnonceDir1 = path1.join(__dirname, "uploadsAnnonce");

// Créer le dossier s'il n'existe pas
if (!fs1.existsSync(uploadsAnnonceDir)) {
  fs1.mkdirSync(uploadsAnnonceDir, { recursive: true });
}

// Configuration Multer pour les annonces
const annonceUpload1 = multer2({
  storage: multer2.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsAnnonceDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "annonce-" + uniqueSuffix + path1.extname(file.originalname));
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Servir les fichiers statiques des annonces
app.use("/uploadsAnnonce", express.static(uploadsAnnonceDir));

// Route pour uploader une image d'annonce
app.post(
  "/api/upload/annonce-image",
  annonceUpload.single("annonceImage"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Aucun fichier uploadé" });
      }

      const filename = req.file.filename;
      // Utiliser l'URL complète pour l'affichage
      const imageUrl = `http://localhost:5000/uploadsAnnonce/${filename}`;

      console.log("Fichier uploadé:", {
        filename: filename,
        path: req.file.path,
        url: imageUrl,
      });

      return res.json({
        message: "Image uploadée avec succès",
        imageUrl: imageUrl,
        filename: filename,
      });
    } catch (error) {
      console.error("Erreur upload:", error);
      return res.status(500).json({ error: "Erreur lors de l'upload" });
    }
  }
);
// 📋 API pour accepter une demande
app.put("/demandes/:id/accepter", async (req, res) => {
  try {
    const demandeId = req.params.id;

    console.log("🟢 Acceptation demande ID:", demandeId);

    // 1. Mettre à jour le statut de la demande
    const updateDemandeSql = "UPDATE demandeloc SET statut = 'accepte' WHERE idDem = ?";

    db.query(updateDemandeSql, [demandeId], async (err, result) => {
      if (err) {
        console.error("❌ Erreur mise à jour demande:", err);
        return res.status(500).json({ error: "Erreur lors de l'acceptation" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Demande non trouvée" });
      }

      // 2. Récupérer les infos de la demande pour le message et notification
      const getDemandeSql = `
        SELECT 
          d.*, 
          a.titre, 
          a.userId as proprietaireId, 
          d.userId as clientId,
          u_proprio.nom as proprio_nom,
          u_proprio.prénom as proprio_prenom,
          u_client.nom as client_nom,
          u_client.prénom as client_prenom
        FROM demandeloc d 
        INNER JOIN annonce a ON d.annonceId = a.idAnnonce 
        INNER JOIN utilisateur u_proprio ON a.userId = u_proprio.userId
        INNER JOIN utilisateur u_client ON d.userId = u_client.userId
        WHERE d.idDem = ?
      `;

      db.query(getDemandeSql, [demandeId], async (err, demandeResults) => {
        if (err) {
          console.error("❌ Erreur récupération infos demande:", err);
          return res.status(500).json({ error: "Erreur récupération infos" });
        }

        if (demandeResults.length === 0) {
          return res.status(404).json({ error: "Infos demande non trouvées" });
        }

        const demandeInfo = demandeResults[0];

        console.log("📧 Création message et notification pour:", {
          client: `${demandeInfo.client_nom} ${demandeInfo.client_prenom}`,
          annonce: demandeInfo.titre
        });

        // 3. Créer un message automatique
        const messageContenu = `🎉 Félicitations ! Votre demande pour "${demandeInfo.titre}" a été acceptée par ${demandeInfo.proprio_nom} ${demandeInfo.proprio_prenom}. Contactez le propriétaire pour finaliser les détails.`;

        const insertMessageSql = `
          INSERT INTO message (contenu, expediteurId, destinataireId, dateEnv, lu) 
          VALUES (?, ?, ?, NOW(), 0)
        `;

        db.query(
          insertMessageSql,
          [
            messageContenu,
            demandeInfo.proprietaireId,
            demandeInfo.clientId,
          ],
          (err, messageResult) => {
            if (err) {
              console.error("❌ Erreur création message:", err);
            } else {
              console.log("✅ Message créé ID:", messageResult.insertId);
            }

            // 4. Créer une notification pour le client
            const notificationTitre = "Demande Acceptée ✅";
            const notificationMessage = `Votre demande pour "${demandeInfo.titre}" a été acceptée !`;

            const insertNotificationSql = `
              INSERT INTO notification (titre, message, typeNotification, userId, dateCreation, lu) 
              VALUES (?, ?, ?, ?, NOW(), 0)
            `;

            db.query(
              insertNotificationSql,
              [
                notificationTitre,
                notificationMessage,
                'acceptation',
                demandeInfo.clientId
              ],
              (err, notificationResult) => {
                if (err) {
                  console.error("❌ Erreur création notification:", err);
                } else {
                  console.log("✅ Notification créée ID:", notificationResult.insertId);
                }

                res.json({
                  success: true,
                  message: 'Demande acceptée avec succès'
                });
              }
            );
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Erreur globale acceptation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'acceptation' });
  }
});

// 📋 API pour refuser une demande
app.put("/demandes/:id/refuser", async (req, res) => {
  try {
    const demandeId = req.params.id;
    const { raison } = req.body;

    console.log("🔴 Refus demande ID:", demandeId, "Raison:", raison);

    const updateDemandeSql = "UPDATE demandeloc SET statut = 'refuse' WHERE idDem = ?";

    db.query(updateDemandeSql, [demandeId], async (err, result) => {
      if (err) {
        console.error("❌ Erreur mise à jour demande:", err);
        return res.status(500).json({ error: "Erreur lors du refus" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Demande non trouvée" });
      }

      const getDemandeSql = `
        SELECT 
          d.*, 
          a.titre, 
          a.userId as proprietaireId, 
          d.userId as clientId,
          u_proprio.nom as proprio_nom,
          u_proprio.prénom as proprio_prenom,
          u_client.nom as client_nom,
          u_client.prénom as client_prenom
        FROM demandeloc d 
        INNER JOIN annonce a ON d.annonceId = a.idAnnonce 
        INNER JOIN utilisateur u_proprio ON a.userId = u_proprio.userId
        INNER JOIN utilisateur u_client ON d.userId = u_client.userId
        WHERE d.idDem = ?
      `;

      db.query(getDemandeSql, [demandeId], async (err, demandeResults) => {
        if (err) {
          console.error("❌ Erreur récupération infos demande:", err);
          return res.status(500).json({ error: "Erreur récupération infos" });
        }

        if (demandeResults.length === 0) {
          return res.status(404).json({ error: "Infos demande non trouvées" });
        }

        const demandeInfo = demandeResults[0];
        const messageRaison = raison ? `\n\nRaison: ${raison}` : '';

        // 3. Créer un message automatique
        const messageContenu = `❌ Votre demande pour "${demandeInfo.titre}" a été refusée par ${demandeInfo.proprio_nom} ${demandeInfo.proprio_prenom}.${messageRaison}`;

        const insertMessageSql = `
          INSERT INTO message (contenu, expediteurId, destinataireId, dateEnv, lu) 
          VALUES (?, ?, ?, NOW(), 0)
        `;

        db.query(
          insertMessageSql,
          [
            messageContenu,
            demandeInfo.proprietaireId,
            demandeInfo.clientId,
          ],
          (err, messageResult) => {
            if (err) {
              console.error("❌ Erreur création message:", err);
            }

            // 4. Créer une notification pour le client
            const notificationTitre = "Demande Refusée ❌";
            const notificationMessage = `Votre demande pour "${demandeInfo.titre}" a été refusée.`;

            const insertNotificationSql = `
              INSERT INTO notification (titre, message, typeNotification, userId, dateCreation, lu) 
              VALUES (?, ?, ?, ?, NOW(), 0)
            `;

            db.query(
              insertNotificationSql,
              [
                notificationTitre,
                notificationMessage,
                'refus',
                demandeInfo.clientId
              ],
              (err, notificationResult) => {
                if (err) {
                  console.error("❌ Erreur création notification:", err);
                }

                res.json({
                  success: true,
                  message: 'Demande refusée avec succès'
                });
              }
            );
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Erreur globale refus:', error);
    res.status(500).json({ error: 'Erreur serveur lors du refus' });
  }
});

// 📱 API pour envoyer un message avec notification
app.post("/api/messages", (req, res) => {
  const { contenu, expediteurId, destinataireId } = req.body;

  if (!contenu || !expediteurId || !destinataireId) {
    return res.status(400).json({ error: "Contenu, expediteurId et destinataireId sont requis" });
  }

  const sql = `
    INSERT INTO message (contenu, expediteurId, destinataireId, dateEnv, lu) 
    VALUES (?, ?, ?, NOW(), 0)
  `;

  db.query(sql, [contenu, expediteurId, destinataireId], (err, result) => {
    if (err) {
      console.error("❌ Erreur envoi message:", err);
      return res.status(500).json({ error: "Erreur envoi message" });
    }

    const messageId = result.insertId;

    // Récupérer les infos de l'expéditeur pour la notification
    const getExpediteurSql = "SELECT nom, prénom FROM utilisateur WHERE userId = ?";

    db.query(getExpediteurSql, [expediteurId], (err, expediteurResults) => {
      if (err) {
        console.error("❌ Erreur récupération expéditeur:", err);
        return res.json({
          success: true,
          message: "Message envoyé avec succès",
          messageId: messageId
        });
      }

      if (expediteurResults.length === 0) {
        return res.json({
          success: true,
          message: "Message envoyé avec succès",
          messageId: messageId
        });
      }
      const expediteur = expediteurResults[0];
      const nomComplet = `${expediteur.nom} ${expediteur.prénom}`;

      // Créer la notification pour le destinataire
      const notificationTitre = "Nouveau Message 💬";
      const notificationMessage = `${nomComplet} vous a envoyé un message: "${contenu.substring(0, 50)}${contenu.length > 50 ? '...' : ''}"`;

      const insertNotificationSql = `
        INSERT INTO notification (titre, message, typeNotification, userId, messageId, dateCreation, lu) 
        VALUES (?, ?, ?, ?, ?, NOW(), 0)
      `;

      db.query(
        insertNotificationSql,
        [
          notificationTitre,
          notificationMessage,
          'message',
          destinataireId,
          messageId
        ],
        (err, notificationResult) => {
          if (err) {
            console.error("❌ Erreur création notification:", err);
          }

          res.json({
            success: true,
            message: "Message envoyé avec succès",
            messageId: messageId
          });
        }
      );
    });
  });
});

// 📱 API pour récupérer les messages entre deux utilisateurs
app.get("/api/messages/:userId1/:userId2", (req, res) => {
  const userId1 = req.params.userId1;
  const userId2 = req.params.userId2;

  const sql = `
    SELECT 
      m.*,
      expediteur.nom as expediteur_nom,
      expediteur.prénom as expediteur_prenom
    FROM message m
    INNER JOIN utilisateur expediteur ON m.expediteurId = expediteur.userId
    WHERE (m.expediteurId = ? AND m.destinataireId = ?)
       OR (m.expediteurId = ? AND m.destinataireId = ?)
    ORDER BY m.dateEnv ASC
  `;

  db.query(sql, [userId1, userId2, userId2, userId1], (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération messages:", err);
      return res.status(500).json({ error: "Erreur récupération messages" });
    }

    res.json(results);
  });
});

// 📱 API pour récupérer les notifications
app.get("/api/notifications/:userId", (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT * FROM notification 
    WHERE userId = ? 
    ORDER BY dateCreation DESC
    LIMIT 50
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération notifications:", err);
      return res.status(500).json({ error: "Erreur récupération notifications" });
    }

    res.json(results);
  });
});
// GET /getOffres - Récupérer toutes les offres
app.get("/getOffres", (req, res) => {
  const sql = `
    SELECT 
      idOff,
      titre,
      description,
      dateCreation,
      prix,
      date_fin
    FROM offre
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erreur lors de la récupération des offres:", err);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur lors de la récupération des offres",
        error: err.message
      });
    }

    // Formater les dates pour un meilleur affichage
    const offresFormatees = results.map(offre => ({
      ...offre,
      dateCreation: offre.dateCreation ? new Date(offre.dateCreation).toISOString().split('T')[0] : null,
      date_fin: offre.date_fin ? new Date(offre.date_fin).toISOString().split('T')[0] : null
    }));

    console.log("✅ Offres récupérées:", offresFormatees.length);
    res.status(200).json(offresFormatees);
  });
});


// 🔹 Récupérer toutes les offres
app.get("/api/offres", (req, res) => {
  db.query("SELECT * FROM offre", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// 🔹 Supprimer une offre
app.delete("/api/offresSupp/:idOff", (req, res) => {
  const idOff = req.params.idOff;
  db.query("DELETE FROM offre WHERE idOff = ?", [idOff], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Offre supprimée avec succès" });
  });
});

app.get("/api/offres/:idOff", (req, res) => {
  const idOff = parseInt(req.params.idOff, 10);
  db.query("SELECT * FROM offre WHERE idOff = ?", [idOff], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: "Offre introuvable" });
    res.json(results[0]);
  });
});
// 🔹 Ajouter une offre
app.post('/api/offres/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // récupère l'userId depuis l'URL
    const { titre, description, prix, dureeOffre, date_fin } = req.body;

    // Vérifications de base
    if (!userId) {
      return res.status(400).json({ message: "userId manquant dans l'URL" });
    }

    if (!titre || !description || !prix || !dureeOffre || !date_fin) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    // Insertion dans la table offre
    const insertOffreQuery = `
      INSERT INTO offre (titre, description, prix, dureeOffre, date_fin, dateCreation)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await db.promise().query(insertOffreQuery, [
      titre,
      description,
      prix,
      dureeOffre,
      date_fin,
    ]);

    const offreId = result.insertId;

    // Insertion dans la table pivot utilisateur_offre
    const insertRelationQuery = `
      INSERT INTO utilisateur_offre (userId, idOff)
      VALUES (?, ?)
    `;
    await db.promise().query(insertRelationQuery, [userId, offreId]);

    res.status(201).json({ message: "Offre ajoutée avec succès", offreId });

  } catch (err) {
    console.error("Erreur ajout offre:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});



app.put("/api/offresModff/:idOff", (req, res) => {
  const { idOff } = req.params;
  const { titre, description, prix, dureeOffre, date_fin } = req.body;

  if (!titre || !description || !prix || !dureeOffre || !date_fin) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires" });
  }

  const dateCreation = new Date();
  const dateFin = new Date(date_fin);
  const moisDiff = (dateFin.getFullYear() - dateCreation.getFullYear()) * 12 +
    (dateFin.getMonth() - dateCreation.getMonth());

  if (parseInt(dureeOffre) > moisDiff) {
    return res.status(400).json({ message: `Durée maximale: ${moisDiff} mois` });
  }

  const sql = "UPDATE offre SET titre=?, description=?, prix=?, dureeOffre=?, date_fin=? WHERE idOff=?";
  db.query(sql, [titre, description, prix, dureeOffre, date_fin, idOff], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Offre modifiée avec succès" });
  });

});



app.listen(PORT, () =>
  console.log(` Serveur démarré sur http://localhost:${PORT}`)
);
