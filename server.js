const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// Set the port for Heroku
const port = process.env.PORT || 4200;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 