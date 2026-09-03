const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Resume Upload API
app.post("/upload", upload.single("resume"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ message: "File uploaded successfully", file: req.file });
});

// Candidate Ranking API
app.post("/match", (req, res) => {
  const { resume, jd } = req.body;
  if (!resume && !jd) {
    return res.status(400).json({ error: "Missing both resume content and job description" });
  }
  if (!resume) {
    return res.status(400).json({ error: "Resume content is empty (could not be parsed)" });
  }
  if (!jd) {
    return res.status(400).json({ error: "Job description is missing" });
  }

  // Basic mock match logic for now (later can call AI service)
  const resumeWords = new Set(resume.toLowerCase().split(/\s+/));
  const jdWords = new Set(jd.toLowerCase().split(/\s+/));
  
  if (jdWords.size === 0) return res.json({ score: 0 });

  let matchCount = 0;
  for (const word of jdWords) {
    if (resumeWords.has(word)) matchCount++;
  }

  const score = (matchCount / jdWords.size) * 100;

  res.json({ score: score.toFixed(2), message: "Match calculated successfully" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
