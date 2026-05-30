import { h, render } from 'preact';
import { signal } from '@preact/signals';
import htm from 'htm';

const html = htm.bind(h);
const count = signal(0);

function MiniCounter() {
    return html`
        <div class="card">
            <h2>Preact + HTM Sandbox</h2>
            <p>Current Counter Value: <strong>${count}</strong></p>
            <button onClick=${() => count.value++}>Increment State</button>
        </div>
    `;
}

render(html`<${MiniCounter} />`, document.getElementById('app'));