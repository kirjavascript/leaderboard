import { For, createSignal, createEffect } from 'solid-js';

export default function () {
    const [boards, setBoards] = createSignal([]);
    const [listing, setListing] = createSignal([]);

    createEffect(() => {
        fetch('/api/boards')
            .then(res =>res.json())
            .then(setBoards)
            .catch(console.error);
    });

    createEffect(() => {
        fetch('/api/queue')
            .then(res => res.json())
            .then(setListing)
            .catch(console.error);
    });

    return (
        <>
            <h1>Submission Queue</h1>
            <table>
                <thead>
                    <tr>
                        <th>Board</th>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Style</th>
                        <th>Proof</th>
                    </tr>
                </thead>
                <tbody>
                    <For
                        each={listing()}
                    >
                        {(entry) => (
                            <tr class="row-score">
                                <td>{boards().find(d => d.key === entry.board).name}</td>
                                <td>{entry.player}</td>
                                <td>{entry.score}</td>
                                <td>{entry.style}</td>
                                <td>{entry.proofLevel}</td>
                                <td><button>view</button></td>
                            </tr>
                        )}
                    </For>
                </tbody>
            </table>
        </>
    );
}
