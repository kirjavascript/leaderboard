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
            <pre>{JSON.stringify(listing(),0,4)}</pre>
        </>
    );
}
