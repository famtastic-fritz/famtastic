'use strict';

const { WebSocketServer } = require('ws');

function sendJson(ws, payload) {
  if (!ws || ws.readyState !== 1) return false;
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function broadcastJson(wss, payload) {
  if (!wss || !wss.clients) return 0;
  let sent = 0;
  for (const client of wss.clients) {
    if (sendJson(client, payload)) sent += 1;
  }
  return sent;
}

function broadcastStatus(wss, content) {
  return broadcastJson(wss, { type: 'status', content });
}

function attachTerminalUpgradeHandler({ server, wss, terminals }) {
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    const match = url.pathname.match(/^\/terminal\/(\d+)$/);
    if (match) {
      const termId = match[1];
      const term = terminals.get(termId);
      if (!term) {
        socket.destroy();
        return;
      }

      const termWss = new WebSocketServer({ noServer: true });
      termWss.handleUpgrade(request, socket, head, (ws) => {
        term.connections.add(ws);

        term.ptyProcess.onData((data) => {
          try {
            if (ws.readyState === 1) ws.send(data);
          } catch {}
        });

        ws.on('message', (data) => {
          term.ptyProcess.write(typeof data === 'string' ? data : data.toString());
        });

        ws.on('close', () => {
          term.connections.delete(ws);
        });
      });
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
}

function setupFileWatcherRuntime({ fs, path, rootDir, wss }) {
  const fileWatchers = [];

  const notifyRestart = (file) => {
    console.log(`[file-watch] ${file} changed — restart recommended`);
    broadcastJson(wss, { type: 'restart-needed', file, timestamp: new Date().toISOString() });
  };

  const filesToWatch = [
    path.join(rootDir, 'server.js'),
    path.join(rootDir, 'public', 'index.html'),
  ];

  for (const filePath of filesToWatch) {
    try {
      let debounceTimer = null;
      const watcher = fs.watch(filePath, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => notifyRestart(path.basename(filePath)), 2000);
      });
      fileWatchers.push(watcher);
    } catch (err) {
      console.log(`[file-watch] Could not watch ${path.basename(filePath)}: ${err.message}`);
    }
  }

  const watchDirectory = (dirPath, filterFn, labelFn) => {
    if (!fs.existsSync(dirPath)) return;
    try {
      let debounceTimer = null;
      const watcher = fs.watch(dirPath, (_eventType, filename) => {
        if (!filterFn(filename)) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => notifyRestart(labelFn(filename)), 2000);
      });
      fileWatchers.push(watcher);
    } catch (err) {
      console.log(`[file-watch] Could not watch ${path.basename(dirPath)} directory: ${err.message}`);
    }
  };

  watchDirectory(path.join(rootDir, 'public', 'css'), (filename) => filename && filename.endsWith('.css'), (filename) => `css/${filename}`);
  watchDirectory(path.join(rootDir, 'public', 'js'), (filename) => filename && filename.endsWith('.js'), (filename) => `js/${filename}`);

  return fileWatchers;
}

module.exports = {
  sendJson,
  broadcastJson,
  broadcastStatus,
  attachTerminalUpgradeHandler,
  setupFileWatcherRuntime,
};
