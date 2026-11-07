import { App } from '@modelcontextprotocol/ext-apps';

const input = document.querySelector('#message');
const result = document.querySelector('#result');
const status = document.querySelector('#status');
const button = document.querySelector('#show');
const app = new App({ name: '__APP_NAME__', version: '0.1.0' }, {});
const render = data => {
  if (typeof data?.structuredContent?.message === 'string') result.textContent = data.structuredContent.message;
};
app.ontoolresult = render;
app.onerror = () => { status.textContent = 'Connection failed. Reopen the widget to reconnect.'; };
document.querySelector('form').addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true;
  try {
    const data = await app.callServerTool({ name: 'show_message', arguments: { message: input.value } });
    if (data.isError) throw new Error('Tool failed');
    render(data); status.textContent = 'Message displayed.';
  } catch { status.textContent = 'Could not display the message. Try again.'; }
  finally { button.disabled = false; }
});
if (window.parent === window) status.textContent = 'Open this widget through an MCP Apps host.';
else {
  try { await app.connect(); button.disabled = false; status.textContent = 'Connected.'; }
  catch { status.textContent = 'Could not connect to the host.'; }
}
