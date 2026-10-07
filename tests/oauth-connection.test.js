const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extensionPath = path.join(__dirname, '..', 'extension');

test('approval completes even when notifying browser tabs stalls', async () => {
    const pending = {
        device_code: 'device-code',
        user_code: 'USER-CODE',
        interval: 5,
        next_poll_at: Date.now() - 1000,
        expires_at: Date.now() + 60_000,
    };
    const values = { pending };
    let messageListener;

    const extensionApi = {
        runtime: {
            getURL: file => `chrome-extension://test/${file}`,
            onInstalled: { addListener() {} },
            onMessage: { addListener(listener) { messageListener = listener; } },
        },
        action: { onClicked: { addListener() {} } },
        storage: {
            local: {
                async get(keys) {
                    const names = Array.isArray(keys) ? keys : [keys];
                    return Object.fromEntries(names.map(name => [name, values[name]]));
                },
                async set(next) { Object.assign(values, next); },
                async remove(keys) {
                    for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key];
                },
                async setAccessLevel() {},
            },
        },
        tabs: { query: () => new Promise(() => {}) },
    };
    const fetch = async () => ({
        ok: true,
        json: async () => ({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }),
    });
    const context = { browser: extensionApi, fetch, URL, URLSearchParams, Map, Date, Promise };

    vm.runInNewContext(fs.readFileSync(path.join(extensionPath, 'background.js'), 'utf8'), context);

    const response = new Promise(resolve => {
        messageListener(
            { type: 'flare-poll' },
            { url: extensionApi.runtime.getURL('settings.html') },
            resolve,
        );
    });
    const result = await Promise.race([
        response,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Approval stayed pending')), 1000)),
    ]);

    assert.equal(result.state, 'connected');
    assert.equal(values.tokens.refresh_token, 'refresh');
    assert.equal(values.pending, undefined);
});

test('settings reflects a saved connection without a page refresh', async () => {
    const elements = new Map();
    const listeners = {};
    let storageChanged;
    let connected = false;
    let staleStatus;

    function element(id) {
        if (!elements.has(id)) {
            elements.set(id, {
                hidden: true,
                addEventListener() {},
            });
        }

        return elements.get(id);
    }

    const extensionApi = {
        permissions: {
            contains: async () => true,
            onAdded: { addListener() {} },
            onRemoved: { addListener() {} },
        },
        runtime: {
            sendMessage: async message => message.type === 'flare-status'
                ? staleStatus || { connected, pending: connected ? null : {
                    user_code: 'USER-CODE',
                    expires_at: Date.now() + 60_000,
                } }
                : {},
        },
        storage: { onChanged: { addListener(listener) { storageChanged = listener; } } },
    };
    const document = {
        hidden: false,
        getElementById: element,
        addEventListener(name, listener) { listeners[name] = listener; },
    };
    const window = { addEventListener(name, listener) { listeners[name] = listener; } };
    const context = {
        browser: extensionApi,
        document,
        window,
        Date,
        URL,
        setTimeout: () => 1,
        clearTimeout() {},
    };

    vm.runInNewContext(fs.readFileSync(path.join(extensionPath, 'settings.js'), 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(element('pending').hidden, false);

    let finishStaleStatus;
    staleStatus = new Promise(resolve => { finishStaleStatus = resolve; });
    listeners.focus();
    storageChanged({ tokens: { newValue: { refresh_token: 'refresh' } } }, 'local');
    finishStaleStatus({ connected: false, pending: { user_code: 'USER-CODE' } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(element('connected').hidden, false);
    assert.equal(element('pending').hidden, true);

    staleStatus = null;
    connected = true;
    listeners.focus();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(element('connected').hidden, false);
});
