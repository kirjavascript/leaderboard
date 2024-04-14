const columns = {
    score: [
        ['Player', 'player'],
        ['Score', 'score'],
        ['Platform', 'platform'],
        ['Style', 'style'],
        ['Proof', 'proofLevel'],
    ],
};

// TODO: if all the columns are the same, hide the column

export default function ScoreTable({ listing, board }) {
    const cols = columns[board().type];

    return (
        <table>
            <thead>
                <tr>
                    <th />
                    <For each={cols}>{([name]) => <th>{name}</th>}</For>
                </tr>
            </thead>
            <tbody>
                <For
                    each={listing()}
                >
                    {(item) => (
                        <tr class="row-score">
                            <td class="index">index</td>
                            <For each={cols}>
                                {([, property]) => (
                                    <td class={property}>{item[property]} </td>
                                )}
                            </For>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );
}