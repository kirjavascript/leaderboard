const getBaseColumns = (scoreCol) => [
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
        <div class="table">
            <div class="row-header">
                <div class="cell" />
                <For each={cols()}>
                    {([name]) => <div class="cell">{name}</div>}
                </For>
            </div>
            <For each={rank(listing())}>
                {([rank, entry]) => (
                    <a class="row" href={`/score/${board().key}/${entry.id}`}>
                        <div class="cell"> {rank} </div>
                        <For each={cols()}>
                            {([, property]) => (
                                <div class="cell">{entry[property]} </div>
                            )}
                        </For>
                    </a>
                )}
            </For>
        </div>
    );
}

function rank(listing) {
    let rank = 0;
    let lastScore;
    return listing.map((entry) => {
        if (lastScore !== entry.score) {
            rank++;
        }
        lastScore = entry.score;
        return [rank, entry];
    });
}
