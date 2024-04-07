const express = require('express');
const { join } = require('path');
const { readFileSync } = require('fs');

const devMode = process.argv.includes('--dev');
const port = process.env.port || 3000;

const api = require('./db');
require('./build')(devMode);

const app = express();

app.use(express.json());
app.use('/', express.static(join(__dirname, '/../static')));
app.use('/', express.static(join(__dirname, '/../dist')));

const homepage = readFileSync(__dirname + '/../static/index.html', 'utf8');

app.get('/boards', (_req, res) => res.json(api.listBoards()));
app.post('/board', (_req, res) => res.json(api.listBoards()));

app.use('*', (_req, res) => {
    res.send(homepage);
});

app.listen(port, () => {
    devMode && console.log(`running at http://localhost:${port}`);
});
