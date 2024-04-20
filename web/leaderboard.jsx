import { For, createSignal, createEffect } from 'solid-js';
import { useSearchParams } from '@solidjs/router';

import ScoreTable from './scoretable';

export default function () {
    const [params, setParams] = useSearchParams();

    const [boards, setBoards] = createSignal([]);
    const [board, setBoard] = createSignal(undefined);
    const [listing, setListing] = createSignal([]);

    fetch('/api/boards')
        .then((res) => res.json())
        .then(setBoards)
        .then(() => {
            if (!params.board) {
                setBoard(boards()[0]);
            } else {
                setBoard(boards().find((b) => b.key === params.board));
            }
        })
        .catch(console.error);

    createEffect(() => {
        if (!board()) return;

        fetch('/api/board', {
            method: 'POST',
            body: JSON.stringify(board()),
        })
            .then((res) => res.json())
            .then(setListing)
            .catch(console.error);
    });

    return (
        <>
            <div class="flex-between">
                <select
                    onChange={(e) => {
                        const board = boards()[e.target.selectedIndex];
                        setBoard(board);
                        setParams({ board: board.key }, { replace: true });
                    }}
                >
                    <For each={boards()}>
                        {({ name, key }) => (
                            <option value={key} selected={key === board()?.key}>
                                {name}
                            </option>
                        )}
                    </For>
                </select>
                <div class="links">
                    <a href="/submit">submit</a>
                    <br />
                    <a href="/queue">queue</a>
                </div>
            </div>
            {board() && <ScoreTable listing={listing} board={board} />}
        </>
    );
}
