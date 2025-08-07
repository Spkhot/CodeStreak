// In server.js

import express from 'express';
import app from './app.js';
import './cron.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const PORT = process.env.PORT || 5000;

// __dirname polyfill for ES modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅✅✅ THE FIX IS HERE ✅✅✅

// --- API routes are already defined in app.js and will be handled first ---

// 1. Serve the static files from the 'frontend' folder (like CSS, JS, images)
// This should come AFTER your API routes have been defined in app.js
app.use(express.static(path.join(__dirname, '../frontend')));

// 2. Add a "catch-all" route.
// This route will catch any GET request that is NOT an API call and NOT a static file.
// It will send back your main index.html file. This is crucial for handling browser refreshes on different pages.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`✅ Server running → http://localhost:${PORT}`);
});