import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express(); 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const ingestToken = process.env.IOT_INGEST_TOKEN;
const supabase =
  supabaseUrl && supabaseSecretKey
    ? createClient(supabaseUrl, supabaseSecretKey)
    : null;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Llama en caída libre",
    message: "Backend funcionando correctamente",
    supabaseConfigured: Boolean(supabase),
  });
});

app.get("/api/telemetry", async (req, res) => {
  if (!supabase) {
    res.status(503).json({ error: "Supabase no está configurado en el servidor." });
    return;
  }

  const deviceId = req.query.device_id;
  if (deviceId !== undefined && typeof deviceId !== "string") {
    res.status(400).json({ error: "device_id debe ser texto." });
    return;
  }

  let query = supabase
    .from("telemetry")
    .select("id, device_id, temperature_c, smoke_ppm, flame_detected, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (typeof deviceId === "string" && deviceId.trim()) {
    query = query.eq("device_id", deviceId.trim());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Could not read telemetry from Supabase:", error.message);
    res.status(500).json({ error: "No se pudo consultar la telemetría." });
    return;
  }

  res.json({ data });
});

app.post("/api/telemetry", async (req, res) => {
  if (!ingestToken) {
    res.status(503).json({ error: "La ingesta IoT no está configurada en el servidor." });
    return;
  }

  if (req.header("x-ingest-token") !== ingestToken) {
    res.status(401).json({ error: "Token de ingesta inválido." });
    return;
  }

  if (!supabase) {
    res.status(503).json({ error: "Supabase no está configurado en el servidor." });
    return;
  }

  const { device_id, temperature_c, smoke_ppm, flame_detected } = req.body ?? {};
  const validDeviceId =
    typeof device_id === "string" && device_id.trim().length > 0 && device_id.length <= 64;
  const validTemperature =
    typeof temperature_c === "number" &&
    Number.isFinite(temperature_c) &&
    temperature_c >= -100 &&
    temperature_c <= 1000;
  const validSmoke =
    typeof smoke_ppm === "number" &&
    Number.isFinite(smoke_ppm) &&
    smoke_ppm >= 0 &&
    smoke_ppm <= 1_000_000;

  if (
    !validDeviceId ||
    !validTemperature ||
    !validSmoke ||
    typeof flame_detected !== "boolean"
  ) {
    res.status(400).json({
      error:
        "Se requiere device_id, temperature_c, smoke_ppm y flame_detected con tipos y valores válidos.",
    });
    return;
  }

  const { data, error } = await supabase
    .from("telemetry")
    .insert({
      device_id: device_id.trim(),
      temperature_c,
      smoke_ppm,
      flame_detected,
    })
    .select("id, device_id, temperature_c, smoke_ppm, flame_detected, created_at")
    .single();

  if (error) {
    console.error("Could not insert telemetry into Supabase:", error.message);
    res.status(500).json({ error: "No se pudo guardar la telemetría." });
    return;
  }

  res.status(201).json({ data });
});

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "Llama en caída libre",
    message: "API disponible",
  });
});

const port = Number(process.env.PORT ?? 3001);

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
