// hidden field + check best practises
// autocomplete for everything

import { For, createSignal, createUniqueId } from 'solid-js';
import { Select as SolidSelect, createOptions } from '@thisbeyond/solid-select';

export default function (props) {
    return (
        <>
            <h1>Submit Score</h1>
            <Select
                options={['foo', 'bar', 'baz']}
                placeholder="name"
                value="foo"
                initialValue="foo"
                onChange={(e) => console.log(e)}
            />
            <Select
                options={['foo', 'bar', 'baz']}
                multiple
                placeholder="name"
                onChange={(e) => console.log(e)}
            />
            <pre>{JSON.stringify(props, 0, 4)}</pre>
        </>
    );
}

function Select({ options, value, ...props }) {
    const opts = createOptions(options, {
        disable: (v) =>
            Array.isArray(value) ? value.includes(v) : v === value,
        filterable: true,
        createable: true,
    });

    console.log(opts);

    return <SolidSelect {...props} {...opts} />;
}
