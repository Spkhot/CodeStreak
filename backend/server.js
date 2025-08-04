// server.js
import express from 'express';  // ✅ ES module import
import app from './app.js';     // ✅ .js extension needed for ES modules
import './cron.js';             // ✅ runs cron tasks
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = process.env.PORT || 5000;

// ⏬ __dirname polyfill for ES modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running → http://localhost:${PORT}`);
});
