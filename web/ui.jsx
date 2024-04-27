import { Select as SolidSelect, createOptions } from '@thisbeyond/solid-select';

export function Select({ options, value, createable, ...props }) {
    const opts = createOptions(options, {
        disable: (v) =>
            Array.isArray(value) ? value.includes(v) : v === value,
        filterable: true,
        createable,
    });

    return <SolidSelect placeholder="" {...props} {...opts} />;
}

export function Textarea(props) {
    let textarea;

    function handleInput() {
        textarea.parentNode.dataset.replicatedValue = textarea.value;
    }

    return <div class="textarea" onInput={handleInput}>
        <textarea ref={textarea} {...props} />
    </div>
}