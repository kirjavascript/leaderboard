const express = require('express');
const { join } = require('path');
const { readFileSync } = require('fs');

const devMode = process.argv.includes('--dev');
const port = process.env.port || 3000;

const api = require('./db');
require('./build')(devMode);

if (process.argv.includes('--unsafe-import')) {
    require('./import')(api).catch(console.error);
}

const app = express();

app.use(express.json({
    type: '*/*',
}));
app.use('/', express.static(join(__dirname, '/../static')));
app.use('/', express.static(join(__dirname, '/../dist')));

// API

app.get('/boards', (_req, res) => res.json(api.listBoards()));
app.post('/board', (req, res) => res.json(new api.Board(req.body).query(req.query)));

// routing

const homepage = readFileSync(__dirname + '/../static/index.html', 'utf8');
app.use('*', (_req, res) => {
    res.send(homepage);
});

app.listen(port, () => {
    devMode && console.log(`running at http://localhost:${port}`);
});
