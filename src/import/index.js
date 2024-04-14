const fs = require('fs');
const { join } = require('path');
const { JSDOM } = require('jsdom');

module.exports = async function importCSV(api) {
    // export old leaderboard as HTML and put in src/import/NES Tetris Leaderboards

    api.addBoard({
        name: 'NTSC',
        key: 'default',
        type: 'score',
    });

    const board = new api.Board(api.listBoards()[0])

    const { csvParse } = await import('d3-dsv');
    const data = fs.readFileSync(
        join(__dirname, './legacy_scores.csv'), // (fractal made this file)
        'utf8',
    );
    const listing = csvParse(data);

    // add editors
    const existingEditors = api.listEditors().map((d) => d.name);

    listing.forEach(({ editor }) => {
        if (!existingEditors.includes(editor)) {
            api.addEditor({ name: editor, password: 'N/A' });
            existingEditors.push(editor);
        }
    });

    const editors = api.listEditors();

    const importScore = item => {
        const editor = editors.find((d) => d.name === item.editor);

        item.player = item.player.replace(/ ?\(.*?\)/, '');

        const score = board.addScore(item);

        score.setEditor(editor.id);

        // set legacy time
        api.db.prepare(
            `
            UPDATE ${board.tableName}
            SET submittedTime = :time,
                verifiedTime = :time,
                modifiedTime = CURRENT_TIMESTAMP,
                verified = 1,
                historical = 1
            WHERE id = :scoreId
        `,
        ).run({ scoreId: score.id, time: item.time });
    };

    // add scores & remap keys

    listing.forEach((item) => {
        item.proofLevel = item['proof level'];
        item.proof = item['proof link'];

        importScore(item);
    });

    // handle vidpb

    listing.forEach(item => {
        const vidPB = item['vid pb'];
        if (vidPB) {
            const existing = api.db.prepare(`SELECT * FROM ${board.tableName} WHERE score = ${vidPB} AND proofLevel LIKE '%Video%'`).get();
            if (!existing) {
                importScore({
                    ...item,
                    time: item.time - (300 * 12),
                    proofLevel: 'Video',
                    proof: 'vid pb column from google sheets'
                })
            }
        }
    });

    // process 'modern' data from the pending queue

    const pending = fs.readFileSync(
        join(__dirname, './NES Tetris Leaderboards/Pending Submissions.html'),
        'utf8',
    );

    // extract colour lookup
    const colors = pending.matchAll(/\.(s\d+)\s*{([\s\S]*?)background-color:\s*#(.{6})/g);

    const colorLookup = {
        orange: [255, 217, 102],
        red: [224, 102, 102],
        green: [147, 196, 125],
        white: [255, 255, 255]
    };

    function closest(hex) {
        const [r, g, b] = hex.match(/../g).map(d => parseInt(d, 16));
        let distances = {};
        for (let color in colorLookup) {
            let colorRGB = colorLookup[color];
            let distance = Math.sqrt(Math.pow(r - colorRGB[0], 2) + Math.pow(g - colorRGB[1], 2) + Math.pow(b - colorRGB[2], 2));
            distances[color] = distance;
        }
        let nearest = Object.keys(distances).reduce((a, b) => distances[a] < distances[b] ? a : b);
        return nearest;
    }

    const colorMap = Object.fromEntries([...colors].map(c => [c[1], closest(c[3])]));

    // extract scores

    const { window: { document } } = new JSDOM(pending);

    const rows = [...document.querySelectorAll('tr')].slice(3);

    const unknownId = api.addEditor({ name: 'unknown', password: 'N/A' });

    const queueInsert = api.db.prepare(`
        INSERT INTO ${board.tableName} (submittedTime, player, score, style, proof, platform, notes, editorId, verified, rejected, historical, proofLevel, verifiedTime)
        VALUES (:submittedTime, :player, :score, :style, :proof, :platform, :notes, :editorId, :verified, :rejected, :historical, :proofLevel, :verifiedTime);
    `);

    const checkQuery = api.db.prepare(`
        SELECT *
        FROM ${board.tableName}
        WHERE LOWER(REGEX_REPLACE(player, '[^a-zA-Z0-9]', '')) = LOWER(REGEX_REPLACE(:player, '[^a-zA-Z0-9]', ''))
        AND score = :score
        AND REPLACE(proofLevel, '+', '') = REPLACE(:proofLevel, '+', '');
    `);

    const updateNotes = api.db.prepare(`
        UPDATE ${board.tableName}
        SET notes = :notes,
        proofLevel = :proofLevel
        WHERE id = :id
    `);

    rows.forEach(row => {
        const cols = [...row.querySelectorAll('td')];

        const color = colorMap[cols[0].className];

        if (!cols[0].textContent || color === 'orange') return;

        if (cols[2].textContent !== 'NTSC 0-19 Score') return;

        const [submittedTime, player, _board, score, style, proof, platform, _type, notes, proofLevel] = cols.map(d => d.textContent);

        const entry = {
            submittedTime, score, style, proof, platform, notes, proofLevel,
            verified: +(color === 'green'),
            rejected: +(color === 'red'),
            historical: 1,
            editorId: color === 'green' ? unknownId : null,
            verifiedTime: color === 'green' ? submittedTime : null,
            player: player.replace(/ ?\(.*?\)/, ''),
        };

        const existing = checkQuery.get(entry);

        if (existing) {
            updateNotes.run({
                id: existing.id,
                notes: entry.notes,
                proofLevel: entry.proofLevel,
            })
        } else {
            queueInsert.run(entry);
        }

    });

    // grab current state of the board and apply over the existing DB

    importGoogleBoard(unknownId, api, board, fs.readFileSync(
        join(__dirname, './NES Tetris Leaderboards/NTSC 0-19 Score.html'),
        'utf8',
    ));

    api.db.prepare(`
        UPDATE ${board.tableName}
        SET player = REPLACE(player, 'Blue_scuti', 'Blue Scuti')
        WHERE player LIKE '%Blue%';
    `).run();
}

function importGoogleBoard(unknownId, api, board, file) {
    const { window: { document } } = new JSDOM(file);

    const rows = [...document.querySelectorAll('tr')];

    const dataRows = rows.slice(3);
    const header = [...rows[1].querySelectorAll('td')].map(d => d.textContent);

    const playerIndex = header.findIndex(d => d.includes('Name'));
    const scoreIndex = header.findIndex(d => d.includes('Score') || d.includes('Level') || d.includes('Lines'));
    const platformIndex = header.findIndex(d => d.includes('Platform'));
    const styleIndex = header.findIndex(d => d.includes('Style'));
    const proofLevelIndex = header.findIndex(d => d.includes('Proof'));
    const notesIndex = header.findIndex(d => d.includes('Notes'));
    const proofIndex = header.findIndex(d => d.includes('Proof Link'));
    const vidPBIndex = header.findIndex(d => d.includes('VidPB'));

    const checkQuery = api.db.prepare(`
        SELECT *
        FROM ${board.tableName}
        WHERE LOWER(REGEX_REPLACE(player, '[^a-zA-Z0-9]', '')) = LOWER(REGEX_REPLACE(:player, '[^a-zA-Z0-9]', ''))
        AND score = :score
        AND REPLACE(proofLevel, '+', '') = REPLACE(:proofLevel, '+', '');
    `);

    const updateNotes = api.db.prepare(`
        UPDATE ${board.tableName}
        SET notes = :notes,
        proofLevel = :proofLevel
        WHERE id = :id
    `);

    const sheetInsert = api.db.prepare(`
        INSERT INTO ${board.tableName} (submittedTime, player, score, style, proof, platform, notes, editorId, verified, rejected, historical, proofLevel, verifiedTime)
        VALUES (:submittedTime, :player, :score, :style, :proof, :platform, :notes, :editorId, :verified, :rejected, :historical, :proofLevel, :verifiedTime);
    `);

    function importGoogleEntry(entry) {
        const existing = checkQuery.get(entry);

        if (existing) {
            updateNotes.run({
                id: existing.id,
                notes: entry.notes,
                proofLevel: entry.proofLevel,
            })
        } else {
            sheetInsert.run(entry);
        }
    }

    dataRows.forEach(row => {
        const cols = [...row.querySelectorAll('td')];

        const entry = {
            player: cols[playerIndex].textContent,
            score: cols[scoreIndex].textContent,
            platform: cols[platformIndex].textContent,
            proofLevel: cols[proofLevelIndex].textContent,
            style: cols[styleIndex].textContent,
            notes: cols[notesIndex].textContent,
            proof: cols[proofIndex].querySelector('a')?.href,

            submittedTime: +new Date,
            verifiedTime: +new Date,
            editorId: unknownId,
            verified: 1,
            rejected: 0,
            historical: 1,
        };

        if (cols[notesIndex].getAttribute('colspan') != '2') {
            entry.proof = cols[proofIndex + 1].querySelector('a')?.href;
            const extraNotes = cols[notesIndex + 1].textContent;
            if (extraNotes.trim().length) {
                entry.notes += ', ' + cols[notesIndex + 1].textContent;
            }
        }

        importGoogleEntry(entry);

        if (vidPBIndex !== -1) {
            const vidPB = cols[vidPBIndex].textContent;

            if (vidPB != entry.score) {
                importGoogleEntry({
                    ...entry,
                    score: vidPB,
                    proofLevel: 'Video',
                    proof: 'vid pb column from google sheets',
                });
            }

        }

    });

}
