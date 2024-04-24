// hidden field + check best practises
// autocomplete for everything

import { For, createSignal, createUniqueId } from 'solid-js';
import { Select } from './ui';

export default function (props) {
    return (
        <>
            <h1>Submit Score</h1>

            <h4>Name</h4>
            <Select
                options={['foo', 'bar', 'baz']}
                placeholder="name"
                value="foo"
                initialValue="foo"
                onChange={(e) => console.log(e)}
            />
            <h4>Foo</h4>
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
