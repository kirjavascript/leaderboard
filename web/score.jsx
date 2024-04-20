import { createSignal, createEffect, Show, Switch, Match } from 'solid-js';

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
                <div class="flex-between">
                    <h1>
                        {entry().player} - {entry().score}
                    </h1>
                    <h1>{entry().board.name}</h1>
                </div>

                <Embed getLink={() => entry().proof} />

                <p class="text-center">{entry().notes}</p>

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
                        <div class="cell">Timestamp</div>
                        <div class="cell">TODO: {entry().submittedTime}</div>
                    </div>
                    <div class="row">
                        <div class="cell">Verified</div>
                        <div class="cell">
                            {entry().verified ? (
                                <img width="18" height="18" src="/check.webp" />
                            ) : (
                                false
                            )}
                        </div>
                    </div>
                </div>
            </Show>

            <>{error() && <h1>{error()}</h1>}</>
        </>
    );
}

function Embed({ getLink }) {
    const [embed, setEmbed] = createSignal({});

    createEffect(() => {
        const link = getLink();
        if (!link) return undefined;

        let url;

        try {
            url = new URL(link);
        } catch {
            return {
                type: 'text',
                value: link,
            };
        }

        const { hostname } = url;

        if (hostname.includes('youtube.') || hostname === 'youtu.be') {
            fetch(
                `https://www.youtube.com/oembed?url=${encodeURI(
                    url,
                )}&format=json`,
            )
                .then((res) => res.json())
                .then((res) => {
                    setEmbed({
                        type: 'html',
                        value: res.html,
                    });
                })
                .catch(console.error);
        } else {
            setEmbed({
                type: 'url',
                value: link,
            });
        }
    });

    return (
        <Switch fallback={<p class="text-center">Loading embed...</p>}>
            <Match when={embed().type === 'text'}>
                <p>{embed().value}</p>
            </Match>
            <Match when={embed().type === 'link'}>
                <a href={embed().value}>{embed().value}</a>
            </Match>
            <Match when={embed().type === 'html'}>
                <div class="youtube-wrapper">
                    <div class="youtube">
                        <div class="embed" innerHTML={embed().value} />
                    </div>
                </div>
            </Match>
        </Switch>
    );
}
