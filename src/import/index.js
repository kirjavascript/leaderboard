const fs = require('fs');
const { join } = require('path');

module.exports = async function importCSV(api) {
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

    // process 'modern' data

    // export as HTML from the old leaderboard
    const pending = fs.readFileSync(
        join(__dirname, './Pending Submissions.html'),
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

    const { JSDOM } = require('jsdom');

    const { window: { document } } = new JSDOM(pending);

    const rows = [...document.querySelectorAll('tr')].slice(3);

    const unknownID = api.addEditor({ name: 'unknown', password: 'N/A' });

    rows.forEach(row => {
        const cols = [...row.querySelectorAll('td')];

        const color = colorMap[cols[0].className];

        if (!cols[0].textContent || color === 'orange') return;


        console.log(cols.map(d => d.textContent).join(','));

    });
}
