const devMode = process.argv.includes('--dev');

require('./build')(devMode);

const express = require('express');
const { join } = require('path');

const app = express();

app.use('/', express.static(join(__dirname, '/../static')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    devMode && console.log(`running at http://localhost:${PORT}`);
});
