const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const healthRouter = require('./src/routes/health');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Root route serves index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard route serves dashboard.html explicitly
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Modularized health route
app.use('/health', healthRouter);

// API route returning current deployed commit SHA
app.get('/api/version', (req, res) => {
  res.json({
    version: process.env.GIT_SHA || 'dev-local-commit'
  });
});

// 404 Unknown Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route Not Found' });
});

// Export the app for Jest / Supertest
module.exports = app;

// Listen on server if executed directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}
