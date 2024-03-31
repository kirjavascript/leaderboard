const { join } = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dbPath = join(__dirname, `/../scores.db`);
const hasDB = fs.existsSync(dbPath);
const db = require('better-sqlite3')(dbPath);

db.pragma('journal_mode = WAL'); // only one connection at a time is made

!hasDB && db.exec(`
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
        deactivated BOOLEAN DEFAULT 0
    );

    CREATE TABLE platform (
        id INTEGER PRIMARY KEY,
        name TEXT
    );

    INSERT INTO platform (name) VALUES ('Emulator');
    INSERT INTO platform (name) VALUES ('Console');

    CREATE TABLE style (
        id INTEGER PRIMARY KEY,
        name TEXT
    );

    INSERT INTO style (name) VALUES ('DAS');
    INSERT INTO style (name) VALUES ('Tap');
    INSERT INTO style (name) VALUES ('Roll');
    INSERT INTO style (name) VALUES ('Bufferfly');
    INSERT INTO style (name) VALUES ('Mojatap');

    CREATE TABLE proofLevel (
        id INTEGER PRIMARY KEY,
        name TEXT
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

const boardTypes = {
    highscore: {
        schema: 'score INTEGER NOT NULL,',
    },
    level: {
        schema: 'level INTEGER NOT NULL,',
    },
    lines: {
        schema: 'lines INTEGER NOT NULL,',
    },
};

function addBoard({ name, key, type }) {
    if (!(type in boardTypes)) throw new Error('invalid boardtype');

    db.prepare('INSERT INTO boards (`name`, `key`, `type`) VALUES (:name, :key, :type)').run({
        name,
        key,
        type,
    });

    const tableName = hashBoardName(key);

    db.exec(`
        CREATE TABLE ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
            ${boardTypes[type].score}

            playerName TEXT NOT NULL,

            platformId INTEGER NOT NULL,
            proofLevelId INTEGER NOT NULL,
            styleId INTEGER NOT NULL,
            editorId INTEGER,

            notes TEXT,
            proof TEXT,
            verified BOOLEAN NOT NULL,
            submittedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            verifiedTime TIMESTAMP,
            modifiedTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (platformId) REFERENCES platform(id),
            FOREIGN KEY (styleId) REFERENCES style(id),
            FOREIGN KEY (proofLevelId) REFERENCES proofLevel(id),
            FOREIGN KEY (editorId) REFERENCES editor(id)
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
    }

    addScore = () => {


    };
}

!hasDB && addBoard({
    name: '0-19 Score',
    key: 'score',
    type: 'highscore',
});


const listQuery = db.prepare('SELECT * from boards');
const listBoards = () => listQuery.all();


// editors

const listEditQuery = db.prepare('SELECT * from boards');
const listEditors = () => listEditQuery.all();

const hashPassword = (pass) => crypto.createHmac('sha256', passSalt).update(pass).digest('hex');
const passSalt = fs.readFileSync(join(__dirname, '/salt'), 'utf8') || (() => {throw new Error('provide salt file')})();

function addEditor({ name, password }) {
    db.prepare('INSERT INTO boards (`name`, `password`) VALUES (:name, :password)').run({
        name,
        password: hashPassword(password),
    });
}
;
function authEditor({ name, password }) {
    const hashed = hashPassword(password);
    return db.prepare('SELECT 1 FROM editors WHERE name = :name AND password = :password').get({
        name,
        password: hashed,
    });
}


// import

async function importCSV(board) {
    const { csvParse } = await import('d3-dsv');
    const data = fs.readFileSync(join(__dirname, '../data/all_scores.csv'), 'utf8');
    const listing = csvParse(data);

    // add editors
    const existingEditors = listEditors().map(d => d.name);

    listing.forEach(({ editor }) => {
        if (!existingEditors.includes(editor)) {
            addEditor(item.editor);
            existingEditors.push(editor);
        }
    });

    console.log(existingEditors);
}

importCSV(new Board(listBoards()[0])).catch(console.error);


// dedupe by score, playstyle, region
// proof level should be

// import: vid pb proof level consolodate
//
// playerProfile with history
// have exclude and include for tags
// TODO: boardLayout show region available





// API
module.exports = { addBoard, listBoards, Board, listEditors };
