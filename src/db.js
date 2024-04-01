const { join } = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dbPath = join(__dirname, `/../scores.db`);
const hasDB = fs.existsSync(dbPath);
const db = require('better-sqlite3')(dbPath);

db.pragma('journal_mode = WAL'); // only one connection at a time is made

!hasDB &&
    db.exec(`
    CREATE TABLE boards (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        name TEXT,
        key VARCHAR(100) UNIQUE,
        type VARCHAR(100),
        public BOOLEAN DEFAULT 1
    );

    CREATE TABLE editors (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        name TEXT,
        password TEXT,
        deactivated BOOLEAN DEFAULT 0,
        admin BOOLEAN DEFAULT 0
    );

    CREATE TABLE tags (
        id INTEGER PRIMARY KEY,
        name TEXT
    );

    INSERT INTO tags (name) VALUES ('WR');
    INSERT INTO tags (name) VALUES ('former WR');
    INSERT INTO tags (name) VALUES ('og rom');
    INSERT INTO tags (name) VALUES ('gym');
    INSERT INTO tags (name) VALUES ('gym v5');
    INSERT INTO tags (name) VALUES ('SPS');
    INSERT INTO tags (name) VALUES ('speedhack');
    INSERT INTO tags (name) VALUES ('crash');
    INSERT INTO tags (name) VALUES ('pausing');
    INSERT INTO tags (name) VALUES ('masters');
    INSERT INTO tags (name) VALUES ('CTM');
    INSERT INTO tags (name) VALUES ('CTWC');
    INSERT INTO tags (name) VALUES ('history viewer');
    INSERT INTO tags (name) VALUES ('minor pausing');
    INSERT INTO tags (name) VALUES ('long pausing');
    INSERT INTO tags (name) VALUES ('19 start');
    INSERT INTO tags (name) VALUES ('keyboard');

`);

// boards

const boardTypes = ['score', 'level', 'linesHigh', 'linesLow'];

function addBoard({ name, key, type }) {
    if (!boardTypes.includes(type)) throw new Error('invalid boardtype');

    db.prepare(
        'INSERT INTO boards (`name`, `key`, `type`) VALUES (:name, :key, :type)',
    ).run({
        name,
        key,
        type,
    });

    const tableName = hashBoardName(key);

    db.exec(`
        CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,

            score REAL NOT NULL,
            player TEXT NOT NULL,

            platform TEXT,
            proofLevel TEXT,
            style TEXT,

            notes TEXT,
            proof TEXT,
            editorId INTEGER,
            verified BOOLEAN NOT NULL,
            rejected BOOLEAN DEFAULT 0,
            submittedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verifiedTime TIMESTAMP,
            modifiedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (editorId) REFERENCES editors(id)
        );

        CREATE TABLE ${tableName}_tags (
            ${tableName}_id INTEGER,
            ${tableName}_tag_id INTEGER,
            PRIMARY KEY (${tableName}_id, ${tableName}_tag_id),
            FOREIGN KEY (${tableName}_id) REFERENCES ${tableName}(id),
            FOREIGN KEY (${tableName}_tag_id) REFERENCES ${tableName}_tags(id)
        );
    `);
}

function hashBoardName(key) {
    const hash = crypto
        .createHmac('sha256', 'scorestack')
        .update(key)
        .digest('hex')
        .slice(0, 6);
    const clean = key.replace(/[^a-zA-Z0-9]/g, '').slice(0, 128);
    return `board_${clean}_${hash}`;
}

class Board {
    constructor({ key, type }) {
        this.key = key;
        this.type = type;
        this.tableName = hashBoardName(key);

        this.addScoreQuery = db.prepare(`
            INSERT INTO ${this.tableName} (score, player, platform, proofLevel, style, notes, proof, editorId, verified)
            VALUES (:score, :player, :platform, :proofLevel, :style, :notes, :proof, NULL, 0);
        `);

        this.addScore = (entry) => new Score({
            tableName: this.tableName,
            id: this.addScoreQuery.run(entry).lastInsertRowid,
        });
    }
}

// scores

class Score {
    constructor({ tableName, id }) {
        this.tableName = tableName;
        this.id = id;

        this.setEditorQuery = db.prepare(`
            UPDATE ${this.tableName}
            SET editorId = :editorId,
                modifiedTime = CURRENT_TIMESTAMP
            WHERE id = :scoreId
        `);

        this.setEditor = (editorId) =>
            this.setEditorQuery.run({
                scoreId: this.id,
                editorId,
            });
    }
}


const listQuery = db.prepare('SELECT * from boards');
const listBoards = () => listQuery.all();

// editors

const listEditQuery = db.prepare('SELECT * from editors');
const listEditors = () => listEditQuery.all();

const hashPassword = (pass) =>
    crypto.createHmac('sha256', passSalt).update(pass).digest('hex');
const passSalt =
    fs.readFileSync(join(__dirname, '/../salt'), 'utf8') ||
    (() => {
        throw new Error('provide salt file');
    })();

function addEditor({ name, password }) {
    db.prepare(
        'INSERT INTO editors (`name`, `password`, `deactivated`) VALUES (:name, :password, 1)',
    ).run({
        name,
        password: hashPassword(password),
    });
}

function authEditor({ name, password }) {
    const hashed = hashPassword(password);
    return db
        .prepare(
            'SELECT 1 FROM editors WHERE name = :name AND password = :password',
        )
        .get({
            name,
            password: hashed,
        });
}

// import

async function importCSV(board) {
    const { csvParse } = await import('d3-dsv');
    const data = fs.readFileSync(
        join(__dirname, '../data/all_scores.csv'),
        'utf8',
    );
    const listing = csvParse(data);

    // add editors
    const existingEditors = listEditors().map((d) => d.name);

    listing.forEach(({ editor }) => {
        if (!existingEditors.includes(editor)) {
            addEditor({ name: editor, password: 'N/A' });
            existingEditors.push(editor);
        }
    });

    const editors = listEditors();

    // add scores

    listing.forEach((item) => {
        const editor = editors.find((d) => d.name === item.editor);
        item.proofLevel = item['proof level'];
        item.proof = item['proof link'];

        const score = board.addScore(item);

        score.setEditor(editor.id);

        db.prepare(
            `
            UPDATE ${board.tableName}
            SET submittedTime = :time,
                verifiedTime = :time,
                modifiedTime = CURRENT_TIMESTAMP,
                verified = 1
            WHERE id = :scoreId
        `,
        ).run({ scoreId: score.id, time: score.time });
    });

    // TODO: vidPB
}

// init

if (!hasDB) {
    addBoard({
        name: 'NTSC 0-19 Score',
        key: 'default',
        type: 'score',
    });

    importCSV(new Board(listBoards()[0])).catch(console.error);
}

// API
module.exports = {
    Board,
    Score,
    addBoard,
    listBoards,
    listEditors,
    addEditor,
    authEditor,
    importCSV,
};
