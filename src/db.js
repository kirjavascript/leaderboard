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
        active BOOLEAN DEFAULT 0,
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
    INSERT INTO tags (name) VALUES ('recalculated crash');
    INSERT INTO tags (name) VALUES ('recalculated score');
    INSERT INTO tags (name) VALUES ('masters');
    INSERT INTO tags (name) VALUES ('CTM');
    INSERT INTO tags (name) VALUES ('CTWC');
    INSERT INTO tags (name) VALUES ('history viewer');
    INSERT INTO tags (name) VALUES ('pausing');
    INSERT INTO tags (name) VALUES ('pause abuse');
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
            historical BOOLEAN DEFAULT 0,
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

        this.query = (time) => {
            const listing = db.prepare(`
                SELECT t1.*
                FROM ${this.tableName} t1
                JOIN (
                    SELECT player, MAX(score) AS max_score
                    FROM ${this.tableName}
                    WHERE verified = true
                    GROUP BY player
                ) t2 ON t1.player = t2.player AND t1.score = t2.max_score
                ORDER BY t1.score DESC;
            `).all();

                    // AND submittedTime < ${time ?? 0}

            // dedupe when a score has improved
            for (let i = 0; i < listing.length; i++) {
                const cur = listing[i];
                const next = listing[i + 1];
                if (next && (cur.player === next.player) && (cur.score === next.score)) {
                    delete listing[i];
                }
            }

            return listing.filter(Boolean);
        };
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


const listQuery = db.prepare('SELECT name, key, type from boards WHERE public = 1');
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
        'INSERT INTO editors (`name`, `password`, `active`) VALUES (:name, :password, 0)',
    ).run({
        name,
        password: hashPassword(password),
    }).lastInsertRowid;
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

// API
module.exports = {
    db,
    Board,
    Score,
    addBoard,
    listBoards,
    listEditors,
    addEditor,
    authEditor,
};
