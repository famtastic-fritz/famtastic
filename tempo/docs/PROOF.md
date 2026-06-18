# PROOF — Tempo runs end to end

Captured on 2026-06-18 against a freshly started server (`npm start`, port 4321).

## 1. Server boots with no install step
```
> tempo@1.0.0 start
> node src/server.js

  Tempo running →  http://localhost:4321
```

## 2. Full flow over the live API
```
== health ==
{"ok":true}

== create task ==
task id: task_mqizjw6o_1yo552

== complete it ==
{"id":"task_mqizjw6o_1yo552","title":"Prove Tempo works","done":true,
 "createdAt":"2026-06-18T04:14:16.752Z","completedAt":"2026-06-18T04:14:16.789Z"}

== log a 25-min session on it ==
{"id":"sess_mqizjw7w_fb1ogr","taskId":"task_mqizjw6o_1yo552","minutes":25,
 "startedAt":"2026-06-18T03:49:16.796Z","endedAt":"2026-06-18T04:14:16.796Z"}

== stats ==
{"date":"2026-06-18","tasksCompletedToday":1,"focusMinutesToday":25,
 "activeTasks":0,"totalTasks":1,"totalSessions":1}

== index served? ==
HTTP 200, 2483 bytes

== styles served? ==
HTTP 200 text/css; charset=utf-8
```

## 3. Data persists across a restart
After killing and restarting the server, the same task and 25 focus minutes
were still present:
```
{"tasks":[{"id":"task_mqizjw6o_1yo552","title":"Prove Tempo works","done":true,...}]}
{"date":"2026-06-18","tasksCompletedToday":1,"focusMinutesToday":25,"activeTasks":0,...}
```

## 4. Tests pass
```
# tests 22
# pass 22
# fail 0
```

## How to start it yourself
```bash
cd tempo
npm start      # then open http://localhost:4321
npm test       # 22 tests
```
