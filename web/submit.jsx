import { createSignal, Show } from 'solid-js';
import { Select, Textarea } from './ui';

export default function ({ location: { query } }) {
    const [completions, setCompletions] = createSignal();
    const [board, setBoard] = createSignal(undefined);

    fetch('/api/submit/completions')
        .then((res) => res.json())
        .then(setCompletions)
        .then(() => {
            const { boards } = completions();
            setBoard(boards.find((b) => b.key === query.board) || boards[0]);
        })
        .catch(console.error);

    const [formData, setFormData] = createSignal({

    });

    const updateForm = data => setFormData(Object.assign({}, formData(), data));

    const handleChange = (data, event) => {
        updateForm({ [data]: event.target.value })
    };

    return (
        <Show when={completions()}>
            {JSON.stringify(formData(),0,4)}
            <h1>Submit Score</h1>

            <input name="watermelon" onChange={[handleChange, 'watermelon']}/>

            <h4>Board</h4>
            <select
                onChange={(e) => {
                    setBoard(completions().boards[e.target.selectedIndex])

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

            <Select
                options={completions().boards.map(board => board.name)}
                name="player"
                createable
            />

            <h4>Player Name</h4>
            <Select
                options={completions().players || []}
                name="player"
                createable
            />
            <h4>Score</h4>
            <input name="score" onInput={[handleChange, 'score']} />
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
            <Textarea />
            <h4>Tags</h4>
            <Select
                options={['foo', 'bar', 'baz']}
                multiple
                placeholder="name"
                onChange={(e) => console.log(e)}
            />
            <br />
            <button>Submit</button>
        </Show>
    );
}
