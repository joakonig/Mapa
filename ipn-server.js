const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Aquí guardamos los tokens temporales en memoria
const enlacesTemporales = new Map();

// Ruta de prueba para ver si está activo
app.get("/", (req, res) => {
  res.send("Servidor IPN activo ✅");
});

// Ruta que PayPal llama para notificar pago
app.post("/ipn", (req, res) => {
  const body = req.body;

  if (body.payment_status === "Completed") {
    const email = body.payer_email;
    console.log(`✅ Pago confirmado de ${email}`);

    // Crear enlace de descarga válido por 10 minutos
    const token = uuidv4();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

    enlacesTemporales.set(token, { expiresAt });

    const link = `https://${req.headers.host}/descargar/${token}`;
    console.log(`🔗 Enlace de descarga generado: ${link}`);

    // Aquí podrías enviar el enlace por email al usuario...
    // (eso lo podemos ver en otro paso)

    // Por ahora solo respondemos con el link para pruebas
    res.send(`Gracias por tu compra. Descarga tu archivo aquí: ${link}`);
  } else {
    console.log("❌ Pago no completado");
    res.sendStatus(200); // igual debes responder 200
  }
});

// Ruta para acceder al archivo con token válido
app.get("/descargar/:token", (req, res) => {
  const token = req.params.token;
  const data = enlacesTemporales.get(token);

  if (!data) {
    return res.status(404).send("❌ Enlace inválido");
  }

  if (Date.now() > data.expiresAt) {
    enlacesTemporales.delete(token); // limpiar
    return res.status(410).send("⏰ Enlace expirado");
  }

  // Servir archivo (debe estar en la carpeta del backend)
  const archivoPath = path.join(__dirname, "archivo-premium.pdf");

  res.download(archivoPath, "archivo-premium.pdf", (err) => {
    if (err) {
      console.error("❌ Error al enviar archivo:", err);
      res.sendStatus(500);
    } else {
      console.log(`✅ Archivo enviado con token: ${token}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

