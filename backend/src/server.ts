
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Ruta principal
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "Llama en caída libre",
    message: "API disponible"
  });
});

// Comprobación del backend
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Llama en caída libre",
    message: "Backend funcionando correctamente"
  });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});

