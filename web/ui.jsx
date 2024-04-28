import { Select as SolidSelect, createOptions } from '@thisbeyond/solid-select';

export function Select({ onChange, name, options, value, createable, ...props }) {
    const opts = createOptions(options, {
        disable: (v) =>
            Array.isArray(value) ? value.includes(v) : v === value,
        filterable: true,
        createable,
    });

    const handleChange = (value) => onChange(value, name);

    return <SolidSelect name={name} onChange={handleChange} placeholder="" {...props} {...opts} />;
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
