// In server.js

import express from 'express';
import app from './app.js';
import './cron.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- ✅✅✅ ADD THE MIDDLEWARE BLOCK HERE ✅✅✅ ---
// This applies the headers to ALL routes, including static files.
app.use('/workspace', (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
// --- ✅✅✅ END OF NEW MIDDLEWARE BLOCK ✅✅✅ ---


// Serve the static files from the 'frontend' folder
app.use(express.static(path.join(__dirname, '../frontend')));

// "catch-all" route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running → http://localhost:${PORT}`);
});