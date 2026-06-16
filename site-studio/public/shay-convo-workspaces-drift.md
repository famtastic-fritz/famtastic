Found the crossed wire. Three facts, no fixing yet — just diagnosis.

The phone is clean. shay-phone/server.py doesn't touch ~/workspace at all. It reads from ~/.shay/kanban.db and ~/.shay/events.jsonl directly. That's why you see the correct jobs in session on your phone — phone is wired right, just not through any "workspace" concept.

~/workspace is the Hermes WebUI default convention. Every hit on that path is in ~/famtastic/_refs/hermes-webui*/ (reference copies of upstream Hermes) and ~/famtastic/agent-command/ (your local agent-command). It got created because Hermes WebUI's resolve_default_workspace() falls back to ~/workspace if no env var is set. Empty orphan, not load-bearing.

The actual "shay workspaces work" Claude was finishing is almost certainly this launchd entry I just spotted:
com.famtastic.shayworkspace — PID 52840, RUNNING right now.
That's a separate desktop app variant (sibling to com.famtastic.shaydesktop which also has two instances running). That's the "Shay Workspace" surface, not the empty ~/workspace folder.

So the crossed wire is: two unrelated things both called "workspace." One is an empty folder from Hermes upstream convention. The other is a desktop app running on your machine.

Before I touch anything — which thread do you want pulled?

A. Audit com.famtastic.shayworkspace (the running app) and figure out what it actually does and whether it's redundant with shay-phone.
B. Kill the empty ~/workspace folder and confirm nothing depends on it.
C. Both, in that order.