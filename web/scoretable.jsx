const getBaseColumns = scoreCol => [
    ['Player', 'player'],
    scoreCol,
    ['Platform', 'platform'],
    ['Style', 'style'],
    ['Proof', 'proofLevel'],
];

const columns = {
    score: getBaseColumns(['Score', 'score']),
    level: getBaseColumns(['Level', 'score']),
    lines: getBaseColumns(['Lines', 'score']),
    linesLow: getBaseColumns(['Lines', 'score']),
};

export default function ScoreTable({ listing, board }) {
    const cols = () => columns[board().type];

    return (
        <table>
            <thead>
                <tr>
                    <th />
                    <For each={cols()}>{([name]) => <th>{name}</th>}</For>
                </tr>
            </thead>
            <tbody>
                <For
                    each={rank(listing())}
                >
                    {([rank, entry]) => (
                        <tr class="row-score">
                            <td class="index">{rank}</td>
                            <For each={cols()}>
                                {([, property]) => (
                                    <td class={property}>{entry[property]} </td>
                                )}
                            </For>
                            <td><button>view</button></td>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );
}

function rank(listing) {
    let rank = 0;
    let lastScore;
    return listing.map(entry => {
        if (lastScore !== entry.score) {
            rank++;
        }
        lastScore = entry.score;
        return [rank, entry];
    });
}
