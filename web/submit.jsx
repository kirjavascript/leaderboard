import { createSignal, Show } from 'solid-js';
import { Select, Textarea } from './ui';

export default function ({ location: { query } }) {
    const [completions, setCompletions] = createSignal();
    const [initialBoard, setInitialBoard] = createSignal();
    const [show, setShow] = createSignal(false);

    fetch('/api/submit/completions')
        .then((res) => res.json())
        .then(setCompletions)
        .then(() => {
            const { boards } = completions();
            const board =
                boards.find((b) => b.key === query.board)?.name ||
                boards[0].name;
            updateForm({ board });
            setInitialBoard(board);
            setShow(true);
        })
        .catch(console.error);

    const [formData, setFormData] = createSignal({});

    const updateForm = (data) =>
        setFormData(Object.assign({}, formData(), data));

    const handleChange = (data, event) => {
        updateForm({ [data]: event.target.value });
    };

    const handleSelect = (text, property) => {
        updateForm({ [property]: text });
    };

    let form;

    const clear = () => {
        setFormData({});
        setShow(false);
        requestAnimationFrame(() => {
            setShow(true);
        });
    };

    // TODO localstorage

    return (
        <Show when={show()}>
            <div class="flex-center">
                <div ref={form} class="form-submit">
                    <h1>Submit Score</h1>
                    {JSON.stringify(formData(), 0, 4)}
                    <a href="/">back to leaderboard</a>

                    <input
                        name="watermelon"
                        onChange={[handleChange, 'watermelon']}
                    />

                    <h4>Board</h4>
                    <Select
                        options={completions().boards.map(
                            (board) => board.name,
                        )}
                        name="board"
                        onChange={handleSelect}
                        initialValue={initialBoard()}
                    />

                    <h4>Player Name</h4>
                    <Select
                        options={completions().players}
                        name="player"
                        onChange={handleSelect}
                        createable
                    />
                    <h4>Score</h4>
                    <input
                        onInput={[handleChange, 'score']}
                    />
                    <h4>Platform</h4>
                    <Select
                        options={completions().platforms}
                        initialValue="Console"
                        name="platform"
                        onChange={handleSelect}
                    />
                    <h4>Playstyle</h4>
                    <Select
                        options={completions().styles}
                        name="style"
                        onChange={handleSelect}
                    />
                    <h4>Proof Level</h4>
                    <Select
                        options={completions().proofLevels}
                        initialValue="Video"
                        name="proofLevel"
                        onChange={handleSelect}
                    />
                    <h4>Proof Link</h4>
                    <input onInput={[handleChange, 'proofLink']} />
                    <h4>Notes</h4>
                    <Textarea
                        onInput={[handleChange, 'notes']}
                    />
                    <h4>Tags</h4>
                    <Select
                        options={['foo', 'bar', 'baz']}
                        multiple
                        placeholder="name"
                        onChange={(e) => console.log(e)}
                    />
                    <br />
                    <div class="flex-between">
                        <button onClick={clear}>Clear</button>
                        <button>Submit</button>
                    </div>
                </div>
            </div>
        </Show>
    );
}
