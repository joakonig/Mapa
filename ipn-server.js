const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Servidor IPN activo ✅");
});

app.post("/ipn", (req, res) => {
  console.log("IPN recibido:", req.body);
  res.sendStatus(200); // Importante: PayPal necesita un 200 OK
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
