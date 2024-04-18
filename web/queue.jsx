import { For, createSignal, createEffect } from 'solid-js';

export default function () {
    const [boards, setBoards] = createSignal([]);
    const [listing, setListing] = createSignal([]);

    createEffect(() => {
        fetch('/api/boards')
            .then((res) => res.json())
            .then(setBoards)
            .catch(console.error);
    });

    createEffect(() => {
        fetch('/api/queue')
            .then((res) => res.json())
            .then(setListing)
            .catch(console.error);
    });

    return (
        <>
            <h1>Submission Queue</h1>
            <div class="table">
                <div class="row-header">
                    <div class="cell">Board</div>
                    <div class="cell">Name</div>
                    <div class="cell">Score</div>
                    <div class="cell">Style</div>
                    <div class="cell">Proof</div>
                </div>
                <For each={listing()}>
                    {(entry) => (
                        <a class="row">
                            <div class="cell">
                                {
                                    boards().find((d) => d.key === entry.board)
                                        .name
                                }
                            </div>
                            <div class="cell">{entry.player}</div>
                            <div class="cell">{entry.score}</div>
                            <div class="cell">{entry.style}</div>
                            <div class="cell">{entry.proofLevel}</div>
                        </a>
                    )}
                </For>
            </div>
        </>
    );
}
