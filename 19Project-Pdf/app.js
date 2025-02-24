const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/plagishieldDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection failed:", err));

// MongoDB Schema and Model
const PlagiarismSchema = new mongoose.Schema({
  admin: String,
  document: String,
  similarity: Number,
  language: String,
});
const Plagiarism = mongoose.model("Plagiarism", PlagiarismSchema);

// Stopwords for multilingual support
const filterWords = {
  en: ["is", "are", "was", "were", "the", "a", "an","the"],
  hi: ["है", "थे", "की", "पर", "में"],
  kn: ["ಅದು", "ಆಗ", "ಈ", "ಆದರೆ", "ಒಂದು"],
};

// Utility Function to Generate Trigrams
function getTrigrams(text) {
  const words = text.split(/\s+/);
  const trigrams = [];
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return trigrams;
}

// Utility Function to Compare Text and Find Matching Trigrams
function compareTextAndHighlight(text1, text2) {
  const trigrams1 = new Set(getTrigrams(text1));
  const trigrams2 = getTrigrams(text2);

  const matchedTrigrams = [];
  trigrams2.forEach((trigram) => {
    if (trigrams1.has(trigram)) matchedTrigrams.push(trigram);
  });

  const similarityPercentage = (matchedTrigrams.length / trigrams2.length) * 100;
  return { similarityPercentage, matchedTrigrams };
}

// Admin credentials
const ADMIN_EMAIL = "avikshakavyagowda1410@gmail.com";
const ADMIN_PASSWORD = "1410";

// Routes
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.get("/login", (req, res) => res.sendFile(__dirname + "/login.html"));
app.get("/dashboard", (req, res) => res.sendFile(__dirname + "/dashboard.html"));
app.get("/result", (req, res) => res.sendFile(__dirname + "/result.html"));

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.redirect("/dashboard");
  } else {
    res.send("<h3>Unauthorized! Only the admin can log in.</h3>");
  }
});

app.post("/compare", async (req, res) => {
  if (!req.files || !req.files.originalFile || !req.files.compareFiles) {
    return res.status(400).json({ error: "Files are required!" });
  }

  try {
    const originalText = (await pdfParse(req.files.originalFile)).text || "";
    const compareFiles = Array.isArray(req.files.compareFiles)
      ? req.files.compareFiles
      : [req.files.compareFiles];

    const results = [];
    for (const file of compareFiles) {
      const compareTextContent = (await pdfParse(file)).text || "";
      const { similarityPercentage, matchedTrigrams } = compareTextAndHighlight(
        originalText,
        compareTextContent
      );

      // Save result to MongoDB
      await Plagiarism.create({
        admin: ADMIN_EMAIL,
        document: file.name,
        similarity: similarityPercentage.toFixed(2),
        language: "en",
      });

      // Generate highlighted report as PDF
      const reportPath = path.join(__dirname, `reports/${file.name}-report.pdf`);
      generateHighlightedPDF(
        originalText,
        compareTextContent,
        matchedTrigrams,
        reportPath
      );

      results.push({
        file: file.name,
        similarity: similarityPercentage.toFixed(2),
        report: `/reports/${file.name}-report.pdf`,
      });
    }

    res.json({ report: results });
  } catch (error) {
    console.error("Error comparing files:", error);
    res.status(500).json({ error: "Error processing the files" });
  }
});

// Function to Generate Highlighted PDF
function generateHighlightedPDF(originalText, compareText, matchedTrigrams, outputPath) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  doc.font("Times-Roman").fontSize(14).text("Similarity Report", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text("Original Document:");
  doc.moveDown().fontSize(10).text(originalText);
  doc.moveDown().fontSize(12).text("Compared Document:");
  
  const highlightedText = compareText.split(/\s+/).map((word, index, words) => {
    const trigram = `${word} ${words[index + 1] || ""} ${words[index + 2] || ""}`;
    return matchedTrigrams.includes(trigram.trim()) ? `*${word}*` : word;
  });

  doc.moveDown().fontSize(10).text(highlightedText.join(" "), { continued: true });
  doc.end();
}

// Ensure reports directory exists
if (!fs.existsSync(path.join(__dirname, "reports"))) {
  fs.mkdirSync(path.join(__dirname, "reports"));
}

// Start the server
const PORT = 3300;
app.listen(PORT, () => console.log(`Server running on http://127.0.0.1:${PORT}`));
