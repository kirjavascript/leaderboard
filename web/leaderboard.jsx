import { For, createSignal, createEffect } from 'solid-js';
import ScoreTable from './scoretable';

export default function () {
    const [boards, setBoards] = createSignal([]);
    const [board, setBoard] = createSignal(undefined);
    const [listing, setListing] = createSignal([]);

    // TODO: URL routing for state

    createEffect(() => {
        fetch('/api/boards')
            .then(res =>res.json())
            .then(setBoards)
            .then(() => {
                setBoard(boards()[0]);
            })
            .catch(console.error);
    });

    createEffect(() => {
        if (!board()) return;

        fetch('/api/board', {
            method: 'POST',
            body: JSON.stringify(board()),
        })
            .then(res => res.json())
            .then(setListing)
            .catch(console.error);
    });

    return (
        <>
            <select
                onChange={(e) =>
                    setBoard(boards()[e.target.selectedIndex])
                }
            >
                <For each={boards()}>
                    {({ name, key }) => (
                        <option
                            value={key}
                            selected={key === board()?.key}
                        >
                            {name}
                        </option>
                    )}
                </For>
            </select>
            {board() && <>
                <ScoreTable listing={listing} board={board} />
            </>}
        </>
    );
}
