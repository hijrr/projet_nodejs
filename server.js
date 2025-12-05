const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();//logicil serveur
const multer = require('multer');
const path = require('path');
const fs = require('fs');
app.use(cors());
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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


// Ajouter cette route pour vérifier si l'email existe
app.get("/api/utilisateur/email/:email", (req, res) => {
  const email = req.params.email;
  
  db.query("SELECT * FROM utilisateur WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("Erreur vérification email:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: "Email non trouvé" });
    }
    
    // Retourner seulement les infos nécessaires (pas le mot de passe)
    const user = {
      userId: results[0].userId,
      email: results[0].email,
      prénom: results[0].prénom,
      nom: results[0].nom
    };
    
    res.json(user);
  });
});

app.put("/api/user/:id", (req, res) => {
  const userId = req.params.id;
  const { nom, prénom, email, motDePasse, telephone } = req.body;

  const updates = [];
  const values = [];

  if (nom !== undefined) updates.push("nom = ?"), values.push(nom);
  if (prénom !== undefined) updates.push("`prénom` = ?"), values.push(prénom);
  if (email !== undefined) updates.push("email = ?"), values.push(email);
  if (motDePasse !== undefined) updates.push("motDePasse = ?"), values.push(motDePasse);
  if (telephone !== undefined) updates.push("telephone = ?"), values.push(telephone);

  if (updates.length === 0)
    return res.status(400).json({ message: "Aucune donnée à mettre à jour" });

  const sql = `UPDATE utilisateur SET ${updates.join(", ")} WHERE userId = ?`;
  values.push(userId);

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur", err });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.json({ message: "Profil mis à jour avec succès !" });
  });
});


const resetCodes = {}; // clé = email, valeur = { code, expire }

// -------------------- ENVOYER CODE RESET --------------------
app.post("/api/user/send-reset-code", (req, res) => {
  const { email } = req.body;

  // Vérifier si l'utilisateur existe dans la DB
  db.query("SELECT * FROM utilisateur WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur", err });
    if (results.length === 0) return res.status(400).json({ message: "Email inconnu" });

    const user = results[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // code 6 chiffres
    const expire = Date.now() + 10 * 60 * 1000; // 10 min
    resetCodes[email] = { code, expire };

    const mailOptions = {
      from: "mahjouba562@gmail.com",
      to: email,
      subject: "Code réinitialisation mot de passe",
      html: `<p>Bonjour ${user.prénom},</p>
             <p>Votre code de réinitialisation est : <b>${code}</b></p>
             <p>Il est valable 10 minutes.</p>`,
    };

    transporter.sendMail(mailOptions, (errMail, info) => {
      if (errMail) {
        console.error("Erreur envoi mail reset:", errMail);
        return res.status(500).json({ message: "Erreur envoi code" });
      }
      res.json({ message: "Code envoyé" });
    });
  });
});

// -------------------- VERIFIER CODE ET RESET MOT DE PASSE --------------------
app.post("/api/user/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;

  const record = resetCodes[email];
  if (!record) return res.status(400).json({ message: "Aucun code demandé" });
  if (Date.now() > record.expire) return res.status(400).json({ message: "Code expiré" });
  if (record.code !== code) return res.status(400).json({ message: "Code incorrect" });

  // Mise à jour mot de passe dans la DB
  db.query("UPDATE utilisateur SET motDePasse = ? WHERE email = ?", [newPassword, email], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur", err });

    // Supprimer code utilisé
    delete resetCodes[email];

    res.json({ message: "Mot de passe mis à jour avec succès" });
  });
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


// Vérifier si une demande a été acceptée pour une annonce donnée
app.get("/api/demandes/etat", (req, res) => {
  const { userId, annonceId } = req.query;

  if (!userId || !annonceId) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const sql = `
    SELECT statut 
    FROM demandeloc 
    WHERE userId = ? AND annonceId = ?
    ORDER BY dateDem DESC
    LIMIT 1
  `;

  db.query(sql, [userId, annonceId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Erreur serveur" });
    }

    if (results.length === 0) {
      return res.json({ etat: null });
    }

    return res.json({ etat: results[0].statut });
  });
});

app.get("/getAnnoncesActif", (req, res) => {
  db.query("SELECT * FROM annonce where statu='ACTIVE'", (err, results) => {
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

app.post("/api/demandeloc", (req, res) => {
  const { annonceId, userId } = req.body;
  const dateDem = new Date();

  const sql = `
    INSERT INTO demandeloc (annonceId, userId, dateDem, statut)
    VALUES (?, ?, ?, 'en attente')
  `;
  db.query(sql, [annonceId, userId, dateDem], (err, result) => {
    if (err) {
      console.error("Erreur insertion demande :", err);
      return res.status(500).json({ message: "Erreur lors de la demande" });
    }
    res.status(200).json({ idDem: result.insertId });
  });
});


app.post("/api/notifications", (req, res) => {
  const { titre, message, typeNotification, userId, messageId } = req.body;
  const dateCreation = new Date();

  const sql = `
    INSERT INTO notification 
    (titre, message, typeNotification, dateCreation, lu, userId)
    VALUES (?, ?, ?, ?, 0, ?)
  `;
  db.query(sql, [titre, message, typeNotification, dateCreation, userId, messageId], (err) => {
    if (err) {
      console.error("Erreur insertion notification :", err);
      return res.status(500).json({ message: "Erreur notification" });
    }
    res.status(200).json({ message: "Notification ajoutée" });
  });
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


// ⚡ Config nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // ou autre service SMTP
  auth: {
    user: "mahjouba562@gmail.com",
    pass: "tdlu cvfd yefc iuph" // mot de passe d'application Gmail
  }
});

// -------------------- REGISTER --------------------
app.post("/register", (req, res) => {
  const { nom, prénom, email, motDePasse, telephone, role } = req.body;

  if (!nom || !prénom || !email || !motDePasse || !telephone || !role)
    return res.status(400).json({ message: "Tous les champs sont obligatoires" });

  // Vérifier email unique
  db.query("SELECT * FROM utilisateur WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur", error: err });
    if (results.length > 0) return res.status(400).json({ message: "Email déjà utilisé" });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const sql = `
      INSERT INTO utilisateur (nom, prénom, email, motDePasse, telephone, role, isVerified, verificationToken, tokenExpiry)
      VALUES (?, ?, ?, ?, ?, ?, false, ?, ?)
    `;

    db.query(sql, [nom, prénom, email, motDePasse, telephone, role, token, tokenExpiry], (err2, result) => {
      if (err2) return res.status(500).json({ message: "Erreur serveur", error: err2 });

      // 🔹 Lien de vérification via Ngrok 
      const verificationLink = `https://semireligious-charissa-nonprepositionally.ngrok-free.dev/api/verify-email/${token}`;

      const mailOptions = {
        from: "mahjouba562@gmail.com",
        to: email,
        subject: "Vérification de votre email",
        html: `<p>Bonjour ${prénom},</p>
               <p>Veuillez vérifier votre email en cliquant sur ce lien :</p>
               <a href="${verificationLink}">Vérifier mon email</a>
               <p>Ce lien expire dans 10 minutes.</p>`,
      };

      transporter.sendMail(mailOptions, (errMail) => {
        if (errMail) {
          console.error("Erreur envoi mail :", errMail);
          return res.status(500).json({ message: "Impossible d'envoyer l'email de vérification" });
        }
        res.status(201).json({ message: "Inscription réussie, vérifiez votre email !" });
      });
    });
  });
});

// -------------------- VERIFY EMAIL --------------------
app.get("/api/verify-email/:token", (req, res) => {
  const { token } = req.params;

  db.query("SELECT * FROM utilisateur WHERE verificationToken = ?", [token], (err, results) => {
    if (err) return res.status(500).send("Erreur serveur");
    if (results.length === 0) return res.status(400).send("Token invalide");

    const user = results[0];

    if (new Date() > new Date(user.tokenExpiry)) {
      return res.status(400).send("Token expiré");
    }

    db.query(
      "UPDATE utilisateur SET isVerified = 1, verificationToken = NULL, tokenExpiry = NULL WHERE userId = ?",
      [user.userId],
      (err2) => {
        if (err2) return res.status(500).send("Erreur serveur");
        // 🔹 Rediriger vers login après vérification
        res.redirect("http://localhost:3000/login");
      }
    );
  });
});

// -------------------- PURGE COMPTES NON VÉRIFIÉS --------------------
setInterval(() => {
  console.log("⏳ Vérification des comptes non vérifiés…");

  const sql = `
    DELETE FROM utilisateur
    WHERE isVerified = 0
    AND dateInscri <= NOW() - INTERVAL 5 MINUTE;

  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Erreur purge:", err);
      return;
    }

    console.log(`🗑️ Comptes supprimés : ${result.affectedRows}`);
  });

}, 60000); // 1 minute


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

const uploadDir = path.join( "/home/rahma/projet_nodejs", "uploads"); */

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
  const sql = "SELECT * FROM utilisateur where role!='admin'";
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
      console.error("Erreur update annonce :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (statu === "ACTIVE") {
      console.log("🔹 Mise à jour notifications liées à l'annonce :", id);
      const sqlUpdateNotif = "UPDATE notification SET lu = 1 WHERE annonceId = ?";
      db.query(sqlUpdateNotif, [id], (err2, result2) => {
        if (err2) {
          console.error("Erreur update notifications :", err2);
          return res.status(500).json({ message: "Erreur serveur" });
        }
        console.log("✅ Notifications mises à jour :", result2.affectedRows);
        return res.json({ message: "Statut de l'annonce et notifications mises à jour avec succès" });
      });
    } else {
      return res.json({ message: "Statut de l'annonce mis à jour avec succès" });
    }
  });
});


// en haut du fichier (si pas déjà)
const util = require("util");
// db est ton connection object mysql (ex: mysql.createConnection / mysql.createPool)
const query = util.promisify(db.query).bind(db);

app.delete("/annoncesDelite/:id", async (req, res) => {
  const rawId = req.params.id;
  const id = parseInt(rawId, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Identifiant d'annonce invalide." });
  }

  try {
    // 1) vérifier que l'annonce existe
    const rowsAnnonce = await query("SELECT idAnnonce FROM annonce WHERE idAnnonce = ?", [id]);
    if (!rowsAnnonce || rowsAnnonce.length === 0) {
      return res.status(404).json({ message: "Annonce non trouvée." });
    }

    // 2) vérifier s'il y a des favoris liés
    const favRows = await query("SELECT COUNT(*) AS cnt FROM annonce_favorise WHERE idAnnonce = ?", [id]);
    const favCount = favRows && favRows[0] ? Number(favRows[0].cnt || 0) : 0;

    // 3) vérifier s'il y a des demandes de location liées
    const demRows = await query("SELECT COUNT(*) AS cnt FROM demandeloc WHERE annonceId = ?", [id]);
    const demCount = demRows && demRows[0] ? Number(demRows[0].cnt || 0) : 0;

    if (favCount > 0 || demCount > 0) {
      const reasons = [];
      if (favCount > 0) reasons.push(`${favCount} favorite(s)`);
      if (demCount > 0) reasons.push(`${demCount} demande(s) de location`);
      return res.status(400).json({
        message: `Impossible de supprimer cette annonce car elle est liée à ${reasons.join(" et ")}.`,
      });
    }

    // 4) suppression
    const deleteResult = await query("DELETE FROM annonce WHERE idAnnonce = ?", [id]);

    if (deleteResult.affectedRows === 0) {
      // cas improbable puisque on a vérifié l'existence, mais on gère
      return res.status(404).json({ message: "Annonce non trouvée (échec suppression)." });
    }

    return res.json({ message: "Annonce supprimée avec succès." });
  } catch (err) {
    console.error("Erreur endpoint /annoncesDelite:", err);

    // si c'est une violation FK côté DB (s'il y a une contrainte inconnue)
    if (err && err.errno === 1451) {
      return res.status(400).json({
        message:
          "Impossible de supprimer cette annonce : des enregistrements externes y font référence (clé étrangère).",
      });
    }

    return res.status(500).json({ message: "Erreur serveur." });
  }
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
app.put("/api/annonces/:id/status", (req, res) => {
  const idAnnonce = req.params.id;
  const { statu } = req.body; // doit correspondre à ce que tu envoies

  const sql = "UPDATE annonce SET statu = ? WHERE idAnnonce = ?";
  db.query(sql, [statu, idAnnonce], (err, result) => {
    if (err) {
      console.error("Erreur de mise à jour du statut :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json({ message: "Statut mis à jour avec succès" });
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
// =============================================
// 📞 ROUTES POUR LE SYSTÈME DE CONTACT AGENCE
// =============================================


// 🔹 Récupérer toutes les offres
app.get("/api/offres", (req, res) => {
  db.query("SELECT * FROM offre", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results); 
  });
});



// 🏢 Récupérer toutes les agences
app.get("/api/agences", (req, res) => {
  const sql = `
    SELECT 
      userId,
      nom,
      prénom,
      email,
      telephone,
      dateInscri,
      role,
      profileImage
    FROM utilisateur 
    WHERE role = 'agence'
    ORDER BY prénom ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération agences:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Erreur serveur", 
        error: err.message 
      });
    }

    console.log("✅ Agences récupérées:", results.length);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  });
});

// 🔍 Rechercher des agences
app.get("/api/agences/search", (req, res) => {
  const { search } = req.query;
  
  let sql = `
    SELECT 
      userId,
      nom,
      prénom,
      email,
      telephone,
      dateInscri,
      role,
      profileImage
    FROM utilisateur 
    WHERE role = 'agence'
  `;

  let params = [];

  if (search) {
    sql += ` AND (nom LIKE ? OR prénom LIKE ? OR email LIKE ?)`;
    params = [`%${search}%`, `%${search}%`, `%${search}%`];
  }

  sql += ` ORDER BY prénom ASC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Erreur recherche agences:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Erreur serveur", 
        error: err.message 
      });
    }

    console.log("✅ Résultats recherche agences:", results.length);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  });
});

// 👤 Récupérer une agence spécifique par ID
app.get("/api/agences/:id", (req, res) => {
  const agenceId = req.params.id;

  const sql = `
    SELECT 
      userId,
      nom,
      prénom,
      email,
      telephone,
      dateInscri,
      role,
      profileImage
    FROM utilisateur 
    WHERE userId = ? AND role = 'agence'
  `;

  db.query(sql, [agenceId], (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération agence:", err);
      return res.status(500).json({ 
        success: false, 
        message: "Erreur serveur", 
        error: err.message 
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée"
      });
    }

    console.log("✅ Agence récupérée:", results[0].prénom, results[0].nom);
    res.json({
      success: true,
      data: results[0]
    });
  });
});

// 📧 Contacter une agence par email
app.post("/api/agences/:id/contact", (req, res) => {
  try {
    const agenceId = req.params.id;
    const { nom, email, telephone, message } = req.body;

    // Validation des données
    if (!nom || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Nom, email et message sont obligatoires"
      });
    }

    console.log("📧 Contact agence:", {
      agenceId,
      nom,
      email,
      telephone,
      message: message.substring(0, 50) + "..."
    });

    // 1. Récupérer les infos de l'agence
    const getAgenceSql = `
      SELECT prénom, nom, email 
      FROM utilisateur 
      WHERE userId = ? AND role = 'agence'
    `;

    db.query(getAgenceSql, [agenceId], (err, agenceResults) => {
      if (err) {
        console.error("❌ Erreur récupération agence:", err);
        return res.status(500).json({
          success: false,
          message: "Erreur serveur",
          error: err.message
        });
      }

      if (agenceResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Agence non trouvée"
        });
      }

      const agence = agenceResults[0];

      // 2. Enregistrer la demande de contact dans la base (optionnel)
      const insertContactSql = `
        INSERT INTO contact_agence (agenceId, nom_client, email_client, telephone_client, message, date_contact)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      db.query(insertContactSql, [agenceId, nom, email, telephone, message], (err, contactResult) => {
        if (err) {
          console.error("❌ Erreur enregistrement contact:", err);
          // On continue quand même pour envoyer l'email
        }

        // 3. Créer un message dans le système de messagerie
        const messageContenu = `📞 Nouveau message de contact de ${nom} (${email}${telephone ? `, ${telephone}` : ''}):\n\n${message}`;
        
        const insertMessageSql = `
          INSERT INTO message (contenu, expediteurId, destinataireId, dateEnv, lu, type_message) 
          VALUES (?, NULL, ?, NOW(), 0, 'contact_agence')
        `;

        db.query(insertMessageSql, [messageContenu, agenceId], (err, messageResult) => {
          if (err) {
            console.error("❌ Erreur création message:", err);
          } else {
            console.log("✅ Message système créé ID:", messageResult.insertId);
          }

          // 4. Créer une notification pour l'agence
          const notificationTitre = "Nouveau Contact 📞";
          const notificationMessage = `${nom} vous a contacté via le site`;
          
          const insertNotificationSql = `
            INSERT INTO notification (titre, message, typeNotification, userId, dateCreation, lu) 
            VALUES (?, ?, ?, ?, NOW(), 0)
          `;

          db.query(insertNotificationSql, [notificationTitre, notificationMessage, 'contact', agenceId], (err, notificationResult) => {
            if (err) {
              console.error("❌ Erreur création notification:", err);
            } else {
              console.log("✅ Notification créée ID:", notificationResult.insertId);
            }

            // 5. Réponse succès
            res.json({
              success: true,
              message: "Votre message a été envoyé avec succès",
              contactId: contactResult ? contactResult.insertId : null
            });
          });
        });
      });
    });

  } catch (error) {
    console.error("❌ Erreur globale contact agence:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi du message",
      error: error.message
    });
  }
});

// ✏️ Mettre à jour le profil agence (protégé)
/*app.put("/api/agences/profile/:id", (req, res) => {
  const agenceId = req.params.id;
  const { nom, prénom, telephone } = req.body;

  // Validation basique
  if (!nom || !prénom) {
    return res.status(400).json({
      success: false,
      message: "Nom et prénom sont obligatoires"
    });
  }

  const sql = `
    UPDATE utilisateur 
    SET nom = ?, prénom = ?, telephone = ? 
    WHERE userId = ? AND role = 'agence'
  `;

  db.query(sql, [nom, prénom, telephone, agenceId], (err, result) => {
    if (err) {
      console.error("❌ Erreur mise à jour profil agence:", err);
      return res.status(500).json({
        success: false,
        message: "Erreur serveur",
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée ou non autorisée"
      });
    }

    console.log("✅ Profil agence mis à jour:", agenceId);
    res.json({
      success: true,
      message: "Profil mis à jour avec succès"
    });
  });
});

// =============================================
// 🗃️ CRÉATION DE LA TABLE contact_agence (si elle n'existe pas)
// =============================================

const createContactAgenceTable = `
  CREATE TABLE IF NOT EXISTS contact_agence (
    idContact INT PRIMARY KEY AUTO_INCREMENT,
    agenceId INT NOT NULL,
    nom_client VARCHAR(100) NOT NULL,
    email_client VARCHAR(100) NOT NULL,
    telephone_client VARCHAR(20),
    message TEXT NOT NULL,
    date_contact DATETIME DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('non_lu', 'lu', 'traite') DEFAULT 'non_lu',
    FOREIGN KEY (agenceId) REFERENCES utilisateur(userId) ON DELETE CASCADE
  )
`;

db.query(createContactAgenceTable, (err) => {
  if (err) {
    console.error("❌ Erreur création table contact_agence:", err);
  } else {
    console.log("✅ Table contact_agence vérifiée/créée");
  }
});
*/
// =============================================
// 📊 STATISTIQUES POUR LES AGENCES
// =============================================
// =============================================
// 🔔 NOTIFICATIONS POUR LE PROPRIÉTAIRE SEULEMENT
// =============================================

// 📱 Récupérer les notifications de l'utilisateur connecté (propriétaire)
app.get("/api/mes-notifications", (req, res) => {
  // Récupérer l'userId depuis le token ou les paramètres
  const userId = req.query.userId || req.body.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "userId requis" });
  }
  
  const sql = `
    SELECT 
      n.idNotification,
      n.titre,
      n.message,
      n.typeNotification,
      n.dateCreation,
      n.lu,
      n.userId,
      n.messageId
    FROM notification n
    WHERE n.userId = ? 
    ORDER BY n.dateCreation DESC
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erreur récupération notifications:", err);
      return res.status(500).json({ error: "Erreur récupération notifications" });
    }
    
    console.log(`📨 ${results.length} notifications récupérées pour l'utilisateur ${userId}`);
    res.json(results);
  });
});


// 🔹 Suppression interdite si l'offre a été achetée
app.delete("/api/offresSupp/:idOff", (req, res) => {
  const idOff = req.params.idOff;

  // 1️⃣ Vérifier si l'offre existe dans la table Acheter
  db.query(
    "SELECT * FROM acheter WHERE idOffre = ?",
    [idOff],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Erreur serveur." });

      // Offre déjà achetée → suppression interdite
      if (results.length > 0) {
        return res.status(400).json({
          message: "Impossible de supprimer cette offre car elle a déjà été achetée.",
        });
      }

      // 2️⃣ Supprimer l'offre si elle n'est pas achetée
      db.query("DELETE FROM offre WHERE idOff = ?", [idOff], (err) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Erreur lors de la suppression." });

        res.json({ message: "Offre supprimée avec succès." });
      });
    }
  );
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
    const { titre, description, prix, nb_annonces, date_fin } = req.body;

    // Vérifications de base
    if (!userId) {
      return res.status(400).json({ message: "userId manquant dans l'URL" });
    }

    if (!titre || !description || !prix || !nb_annonces || !date_fin) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    // Insertion dans la table offre
    const insertOffreQuery = `
      INSERT INTO offre (titre, description, prix, nb_annonces, date_fin, dateCreation)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await db.promise().query(insertOffreQuery, [
      titre,
      description,
      prix,
      nb_annonces,
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
  const { titre, description, prix, nb_annonces, date_fin } = req.body;

  if (!titre || !description || !prix || !nb_annonces || !date_fin) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires" });
  }

  const dateCreation = new Date();
  const dateFin = new Date(date_fin);
  const moisDiff = (dateFin.getFullYear() - dateCreation.getFullYear()) * 12 +
    (dateFin.getMonth() - dateCreation.getMonth());

 

  const sql = "UPDATE offre SET titre=?, description=?, prix=?, nb_annonces=?, date_fin=? WHERE idOff=?";
  db.query(sql, [titre, description, prix, nb_annonces, date_fin, idOff], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Offre modifiée avec succès" });
  });

});




// 🔔 Nombre de notifications non lues pour le propriétaire
app.get("/api/mes-notifications/non-lues", (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: "userId requis" });
  }
  
  const sql = `
    SELECT COUNT(*) as count 
    FROM notification 
    WHERE userId = ? AND lu = 0
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Erreur comptage notifications:", err);
      return res.status(500).json({ error: "Erreur comptage notifications" });
    }
    
    res.json({ count: results[0].count });
  });
});

// ✅ Marquer une notification comme lue
app.put("/api/mes-notifications/:id/lu", (req, res) => {
  const notificationId = req.params.id;
  const userId = req.body.userId;
  
  const sql = "UPDATE notification SET lu = 1 WHERE idNotification = ? AND userId = ?";
  
  db.query(sql, [notificationId, userId], (err, result) => {
    if (err) {
      console.error("Erreur marquer comme lu:", err);
      return res.status(500).json({ error: "Erreur mise à jour notification" });
    }
    
    res.json({ success: true, message: "Notification marquée comme lue" });
  });
});

// 🗑️ Supprimer une notification
app.delete("/api/mes-notifications/:id", (req, res) => {
  const notificationId = req.params.id;
  const userId = req.body.userId;
  
  const sql = "DELETE FROM notification WHERE idNotification = ? AND userId = ?";
  
  db.query(sql, [notificationId, userId], (err, result) => {
    if (err) {
      console.error("Erreur suppression notification:", err);
      return res.status(500).json({ error: "Erreur suppression notification" });
    }
    
    res.json({ success: true, message: "Notification supprimée" });
  });
});

// =============================================
// 🔄 CRÉATION DE NOTIFICATIONS POUR LE PROPRIÉTAIRE
// =============================================

// Fonction pour créer des notifications pour le propriétaire
const creerNotificationProprietaire = (userId, titre, message, typeNotification) => {
  const sql = `
    INSERT INTO notification (titre, message, typeNotification, userId) 
    VALUES (?, ?, ?, ?)
  `;
  
  db.query(sql, [titre, message, typeNotification, userId], (err, result) => {
    if (err) {
      console.error("❌ Erreur création notification propriétaire:", err);
    } else {
      console.log(`✅ Notification créée pour propriétaire ${userId}: ${titre}`);
    }
  });
};

// Exemple: Quand un client envoie un message au propriétaire
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
    
    // Récupérer les infos de l'expéditeur (client)
    const getExpediteurSql = "SELECT nom, prénom FROM utilisateur WHERE userId = ?";
    
    db.query(getExpediteurSql, [expediteurId], (err, expediteurResults) => {
      if (err) {
        console.error("❌ Erreur récupération expéditeur:", err);
        return res.json({ 
          success: true, 
          message: "Message envoyé avec succès"
        });
      }

      if (expediteurResults.length > 0) {
        const expediteur = expediteurResults[0];
        const nomComplet = `${expediteur.nom} ${expediteur.prénom}`;
        
        // Créer une notification pour le PROPRIÉTAIRE (destinataire)
        creerNotificationProprietaire(
          destinataireId,
          "Nouveau Message 💬",
          `${nomComplet} vous a envoyé un message: "${contenu.substring(0, 50)}${contenu.length > 50 ? '...' : ''}"`,
          'message'
        );
      }

      res.json({ 
        success: true, 
        message: "Message envoyé avec succès"
      });
    });
  });
});

// Exemple: Quand une nouvelle demande est faite sur votre annonce
app.post("/api/demandes", (req, res) => {
  const { annonceId, userId: clientId, datedebut, dateFin } = req.body;
  
  // Récupérer le propriétaire de l'annonce
  const getProprietaireSql = "SELECT userId FROM annonce WHERE idAnnonce = ?";
  
  db.query(getProprietaireSql, [annonceId], (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération propriétaire:", err);
      return res.status(500).json({ error: "Erreur création demande" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Annonce non trouvée" });
    }

    const proprietaireId = results[0].userId;
    
    // Créer la demande
    const createDemandeSql = `
      INSERT INTO demandeloc (dateDem, datedebut, dateFin, userId, annonceId, statut) 
      VALUES (NOW(), ?, ?, ?, ?, 'en attente')
    `;
    
    db.query(createDemandeSql, [datedebut, dateFin, clientId, annonceId], (err, result) => {
      if (err) {
        console.error("❌ Erreur création demande:", err);
        return res.status(500).json({ error: "Erreur création demande" });
      }

      // Récupérer les infos du client
      const getClientSql = "SELECT nom, prénom FROM utilisateur WHERE userId = ?";
      
      db.query(getClientSql, [clientId], (err, clientResults) => {
        if (err) {
          console.error("❌ Erreur récupération client:", err);
          return res.json({ 
            success: true, 
            message: "Demande créée avec succès"
          });
        }

        if (clientResults.length > 0) {
          const client = clientResults[0];
          const nomComplet = `${client.nom} ${client.prénom}`;
          
          // Créer une notification pour le PROPRIÉTAIRE
          creerNotificationProprietaire(
            proprietaireId,
            "Nouvelle Demande 📋",
            `${nomComplet} a fait une demande de location sur votre annonce`,
            'nouvelle_demande'
          );
        }

        res.json({ 
          success: true, 
          message: "Demande créée avec succès",
          demandeId: result.insertId
        });
      });
    });
  });
});

app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT n.*, a.statu
    FROM notification n
    LEFT JOIN annonce a ON n.annonceId = a.idAnnonce
    WHERE n.userId = ? and n.lu = 0
    ORDER BY n.dateCreation DESC
  `;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json(result);
  });
});
// Marquer la notification comme lue
app.put("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const sql = "UPDATE notification SET lu = 1 WHERE idNotification = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json({ message: "Notification marquée comme lue" });
  });
});


console.log("✅ Routes notifications propriétaire configurées");
console.log("✅ Routes agences et contact ajoutées avec succès");
app.listen(PORT, () =>
  console.log(` Serveur démarré sur http://localhost:${PORT}`)
);
