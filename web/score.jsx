import { createSignal, Show } from 'solid-js';

export default function ({ params }) {
    const [entry, setEntry] = createSignal();
    const [error, setError] = createSignal();

    fetch(`/api/score/${params.board}/${params.id}`)
        .then((res) =>
            res.status !== 200
                ? res.text().then((text) => Promise.reject(text))
                : res.json(),
        )
        .then(setEntry)
        .catch(setError);

    return (
        <>
            <Show when={entry()}>
                <div class="menu">
                    <h1>
                        {entry().player} - {entry().score}
                    </h1>
                    <h1>{entry().board.name}</h1>
                </div>
                <p>{entry().notes}</p>

                <div class="table">
                    <div class="row">
                        <div class="cell">Platform</div>
                        <div class="cell">{entry().platform}</div>
                    </div>
                    <div class="row">
                        <div class="cell">Style</div>
                        <div class="cell">{entry().style}</div>
                    </div>
                    <div class="row">
                        <div class="cell">Proof</div>
                        <div class="cell">{entry().proofLevel}</div>
                    </div>
                    <div class="row">
                        <div class="cell">Submitted Time</div>
                        <div class="cell">{entry().submittedTime}</div>
                    </div>
                    <div class="row">
                        <div class="cell">Verified</div>
                        <div class="cell">
                            {entry().verified ? (
                                <img width="18" height="18" src="/check.webp" />
                            ) : (
                                ''
                            )}
                        </div>
                    </div>
                </div>
                <pre>{JSON.stringify(entry(), 0, 4)}</pre>
            </Show>

            <>{error() && <h1>{error()}</h1>}</>
        </>
    );
}
