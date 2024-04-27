import { createSignal, Show } from 'solid-js';
import { Select } from './ui';

export default function (props) {
    const [name, setName] = createSignal();
    const [completions, setCompletions] = createSignal();
    const [board, setBoard] = createSignal(undefined);

    // TODO set default board (from params?)

    fetch('/api/submit/completions')
        .then((res) => res.json())
        .then(setCompletions)
        .catch(console.error);

    return (
        <Show when={completions()}>
            <h1>Submit Score</h1>

            <input name="watermelon" />

            <h4>Board</h4>
            <select
                onChange={(e) => {
                    setBoard(boards()[e.target.selectedIndex])
                }}
            >
                <For each={completions().boards}>
                    {({ name, key }) => (
                        <option value={key} selected={key === board()?.key}>
                            {name}
                        </option>
                    )}
                </For>
            </select>

            <h4>Name</h4>
            <Select
                options={completions().players || []}
                createable
                onChange={(e) => console.log(e)}
            />
            <h4>Score</h4>
            <input name="score" />
            <h4>Platform</h4>
            <Select
                options={completions().platforms || []}
                initialValue="Console"
                onChange={(e) => console.log(e)}
            />
            <h4>Playstyle</h4>
            <Select
                options={completions().styles || []}
                onChange={(e) => console.log(e)}
            />
            <h4>Proof Level</h4>
            <Select
                options={completions().proofLevels || []}
                initialValue="Video"
                onChange={(e) => console.log(e)}
            />
            <h4>Proof Link</h4>
            <input name="score" />
            <h4>Notes</h4>
            markdown??
            <input name="score" />
            <h4>Tags</h4>
            <Select
                options={['foo', 'bar', 'baz']}
                multiple
                placeholder="name"
                onChange={(e) => console.log(e)}
            />

            <button>Submit</button>
            <pre>{JSON.stringify([props, completions()], 0, 4)}</pre>
        </Show>
    );
}
