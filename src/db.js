const { join } = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { salt, mapHash, unhashID, hashID } = require('./salt');

const dbPath = join(__dirname, `/../scores.db`);
const hasDB = fs.existsSync(dbPath);
const db = require('better-sqlite3')(dbPath);

process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

db.pragma('journal_mode = WAL'); // only one connection at a time is made

db.function('REGEX_REPLACE', (str, pattern, replacement) => str.replace(new RegExp(pattern, 'g'), replacement));

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
    INSERT INTO tags (name) VALUES ('crash fix');
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

const boardTypes = ['score', 'level', 'lines', 'linesLow'];

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

const listQuery = db.prepare('SELECT name, key, type from boards WHERE public = 1');
const listBoards = () => listQuery.all();

function getBoard(key) {
    const board = listBoards().find(board => board.key === key);
    if (board) {
        return new Board(board);
    }
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
    constructor({ key, type, name }) {
        this.key = key;
        this.type = type;
        this.name = name;
        this.tableName = hashBoardName(key);

        const addScoreQuery = db.prepare(`
            INSERT INTO ${this.tableName} (score, player, platform, proofLevel, style, notes, proof, editorId, verified)
            VALUES (:score, :player, :platform, :proofLevel, :style, :notes, :proof, NULL, 0);
        `);

        this.addScore = (entry) => new Score({
            tableName: this.tableName,
            id: addScoreQuery.run(entry).lastInsertRowid,
            board: this,
        });

        this.getScore = (hash) => new Score({
            tableName: this.tableName,
            id: unhashID(hash),
            board: this,
        });

        this.query = (query) => {
            const listing = mapHash(db.prepare(`
                SELECT t1.*
                FROM ${this.tableName} t1
                JOIN (
                    SELECT LOWER(REPLACE(player, ' ', '')) AS player_norm, MAX(score) AS max_score
                    FROM ${this.tableName}
                    WHERE verified = true
                    AND rejected = false
                    GROUP BY player_norm
                ) t2 ON LOWER(REPLACE(t1.player, ' ', '')) = t2.player_norm AND t1.score = t2.max_score
                ORDER BY t1.score ${this.type === 'linesLow' ? 'ASC' : 'DESC'};
            `).all());

                    // AND submittedTime < ${time ?? 0}

            // dedupe when a score has improved proof
            for (let i = 0; i < listing.length; i++) {
                const cur = listing[i];
                const next = listing[i + 1];
                if (next && (cur.player === next.player) && (cur.score === next.score)) {
                    delete listing[i];
                }
            }

            return listing.filter(Boolean);
        };

        const pendingQuery = db.prepare(`
            SELECT *
            FROM ${this.tableName}
            WHERE verified = false
            AND rejected = false
        `);

        this.pending = () => mapHash(pendingQuery.all());
    }
}

// scores

class Score {
    constructor({ tableName, id, board }) {
        this.tableName = tableName;
        this.id = id;
        this.board = board;

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

        const query = db.prepare(`
            SELECT * FROM ${this.tableName}
            WHERE id = :id
        `);

        this.query = () => {
            const entry = query.get({ id: this.id })
            if (entry) {
                delete entry.id;
                entry.board = {
                    name: board.name,
                    key: board.key,
                    type: board.type,
                };
                return entry;
            }
        };
    }
}

// submit queue

function pendingSubmissions() {
    const boards = listBoards().map(board => new Board(board));

    const listing = [];

    boards.forEach(board => {
        const pending = board.pending().map(obj => ({ board: board.key, ...obj }));
        listing.push(...pending);
    });

    return listing.sort((a, b) => +new Date(a.submittedTime) - +new Date(b.submittedTime));
}

// submit data

function submitCompletions() {
    const boards = listBoards();
    const boardList = boards.map(board => new Board(board));

    const players = new Map();

    const getKey = name => name.toLowerCase().replace(/\s+/g, '');

    boardList
        .forEach(board => {
            db.prepare(`SELECT DISTINCT player from ${board.tableName}`)
                .all()
                .forEach(({ player }) => {
                    players.set(getKey(player), player);
                });
        });

    const styles = boardList.flatMap((board) =>
        db
            .prepare(`SELECT DISTINCT style from ${board.tableName}`)
            .all()
            .map((d) => d.style),
    );

    return {
        boards,
        players: [...players.values()],
        platforms: ['Emulator', 'Console'],
        styles: styles.filter((d, i, a) => a.indexOf(d) === i),
        proofLevels: ['Video+', 'Video', 'Image', 'Claim'],
    };
}

// editors

const listEditQuery = db.prepare('SELECT * from editors');
const listEditors = () => listEditQuery.all();

const hashPassword = (pass) =>
    crypto.createHmac('sha256', salt).update(pass).digest('hex');

function addEditor({ name, password }) {
    return db.prepare(
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
    listBoards,
    addBoard,
    getBoard,
    Board,
    Score,
    listEditors,
    pendingSubmissions,
    submitCompletions,
    addEditor,
    authEditor,
};
