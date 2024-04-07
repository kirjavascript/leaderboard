const express = require('express');
const { join } = require('path');

const devMode = process.argv.includes('--dev');
const port = process.env.port || 3000;

require('./build')(devMode);

const app = express();

app.use('/', express.static(join(__dirname, '/../static')));
app.use('/', express.static(join(__dirname, '/../dist')));

app.listen(port, () => {
    devMode && console.log(`running at http://localhost:${port}`);
});
