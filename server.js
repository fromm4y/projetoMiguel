import * as tf from "@tensorflow/tfjs-node";
import * as faceapi from "@vladmandic/face-api";
import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import canvas from "canvas";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧠 O tfjs-node já é detectado automaticamente — não precisa forçar faceapi.tf
globalThis.tf = tf;

// 🧩 Configura o ambiente do Node com o canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });


const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use("/models", express.static(path.join(__dirname, "models")));

// 📸 Configura upload
const upload = multer({ dest: path.join(__dirname, "uploads/") });

async function carregarModelos() {
  const MODEL_PATH = path.join(__dirname, "models");
  console.log("📦 Carregando modelos de:", MODEL_PATH);

  await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
  await faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_PATH);

  console.log("✅ Modelos carregados com sucesso!");
}
await carregarModelos();

// 🧠 Endpoint para processar imagem e detectar emoção
app.post("/processar-foto", upload.single("foto"), async (req, res) => {
  try {
    const img = await canvas.loadImage(req.file.path);

    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    fs.unlinkSync(req.file.path); // remove a foto depois de processar

    if (detections.length === 0) {
      return res.json({ facesEncontradas: 0 });
    }

    const expressao = detections[0].expressions;
    const emocao = Object.keys(expressao).reduce((a, b) =>
      expressao[a] > expressao[b] ? a : b
    );
    const confianca = Math.round(expressao[emocao] * 100);

    res.json({
      facesEncontradas: detections.length,
      emocao,
      confianca,
    });
  } catch (err) {
    console.error("❌ Erro no processamento:", err);
    res.status(500).json({ erro: "Erro ao processar imagem" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`)
);