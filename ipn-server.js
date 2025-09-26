const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// 📌 Ruta y URL del archivo
const MAPA_PATH = path.join(__dirname, "Mapa.json");
const MAPA_URL = "https://drive.google.com/uc?export=download&id=1kjZDpxVgmNGFny9O7gTt2JmM8fcrwx94"; // Reemplaza con tu ID real

// 🔐 Enlaces temporales
const enlacesTemporales = new Map();

// 🔄 Descarga Mapa.json si no existe
async function descargarMapaSiNoExiste() {
  if (fs.existsSync(MAPA_PATH)) {
    console.log("✅ Mapa.json ya existe, no se descarga");
    return;
  }

  console.log("⬇️ Descargando Mapa.json desde Google Drive...");
  try {
    const res = await fetch(MAPA_URL);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);

    const fileStream = fs.createWriteStream(MAPA_PATH);
    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on("error", reject);
      fileStream.on("finish", resolve);
    });

    console.log("✅ Mapa.json descargado correctamente");
  } catch (err) {
    console.error("❌ Error al descargar Mapa.json:", err.message);
  }
}

// 🚀 Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor IPN activo ✅");
});

// 📥 Ruta IPN que PayPal llama al pagar
app.post("/ipn", (req, res) => {
  const body = req.body;

  if (body.payment_status === "Completed") {
    const email = body.payer_email;
    console.log(`✅ Pago confirmado de ${email}`);

    // 🔐 Crear token válido por 10 minutos
    const token = uuidv4();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    enlacesTemporales.set(token, { expiresAt });

    const host = req.headers.host || "tu-backend.onrender.com";
    const link = `https://${host}/descargar/${token}`;
    console.log(`🔗 Enlace de descarga generado: ${link}`);

    // Aquí podrías enviar el link por email (lo vemos si querés)
    res.send(`Gracias por tu compra. Descarga tu archivo aquí: <a href="${link}">${link}</a>`);
  } else {
    console.log("❌ Pago no completado");
    res.sendStatus(200); // igual respondemos 200
  }
});

// 📤 Ruta de descarga con token
app.get("/descargar/:token", (req, res) => {
  const token = req.params.token;
  const data = enlacesTemporales.get(token);

  if (!data) {
    return res.status(404).send("❌ Enlace inválido");
  }

  if (Date.now() > data.expiresAt) {
    enlacesTemporales.delete(token);
    return res.status(410).send("⏰ Enlace expirado");
  }

  res.download(MAPA_PATH, "Mapa.json", (err) => {
    if (err) {
      console.error("❌ Error al enviar Mapa.json:", err);
      res.sendStatus(500);
    } else {
      console.log(`✅ Archivo Mapa.json enviado con token: ${token}`);
    }
  });
});

// 🔁 Inicia servidor después de verificar/descargar archivo
descargarMapaSiNoExiste().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
});

