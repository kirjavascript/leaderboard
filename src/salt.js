
const { join } = require('path');
const fs = require('fs');
const Hashids = require('hashids');

let salt;

try {
    salt = fs.readFileSync(join(__dirname, '/../salt'), 'utf8')
} catch (e) {
    console.error('provide salt\n\n' + e.message);
    process.exit(1);
}

const hasher = new Hashids(salt, 5);

function hashID(id) {
    return hasher.encode(id);
}

function unhashID(hash) {
    return hasher.decode(hash)[0];
}

function mapHash(list) {
    return list.map(entry => {
        entry.id = hashID(entry.id);
        return entry;
    });
}

module.exports = { salt, mapHash, hashID, unhashID };
