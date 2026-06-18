# Agent Factory — evaluation make targets.
# Docker targets give OS-level isolation (cannot touch the host repo).
# Local targets run in-place with Python (use a throwaway copy via `make workspace`).

IMAGE ?= agent-factory:latest
OUT   ?= /tmp/agent-factory-eval        # artifact copy-out dir (OUTSIDE the repo)
S     ?= smoke                          # scenario for `make scenario`
DEST  ?= $(HOME)/agent-factory-eval     # local workspace dir for `make workspace`

.PHONY: help
help:
	@echo "Docker (isolated) ----------------------------------------------"
	@echo "  make build         build the sandbox image"
	@echo "  make run           run the bounded proof in a throwaway container"
	@echo "  make scenario S=x  run a demo scenario (smoke|burst|routing|paypal|resilience|autonomy)"
	@echo "  make scorecard     run all checks and print a PASS/FAIL summary"
	@echo "  make demo          narrated walkthrough of the core behaviors"
	@echo "  make autonomy      run the persistent-daemon live-injection demo"
	@echo "  make eval          run + copy artifacts to OUT=$(OUT) for inspection"
	@echo "  make shell         interactive shell inside the sandbox"
	@echo "  make clean         remove the image"
	@echo "Local (no Docker) ----------------------------------------------"
	@echo "  make workspace     copy the factory to DEST=$(DEST) (outside the repo) and run it there"

# ---- Docker (isolated) ----------------------------------------------------
.PHONY: build
build:
	docker build -t $(IMAGE) .

.PHONY: run
run: build
	docker run --rm $(IMAGE)

.PHONY: scenario
scenario: build
	docker run --rm --entrypoint bash $(IMAGE) demo.sh $(S)

.PHONY: scorecard
scorecard: build
	docker run --rm --entrypoint python3 $(IMAGE) scorecard.py

.PHONY: demo
demo: build
	docker run --rm --entrypoint bash $(IMAGE) demo.sh walkthrough

.PHONY: autonomy
autonomy: build
	docker run --rm --entrypoint bash $(IMAGE) demo.sh autonomy

.PHONY: shell
shell: build
	docker run --rm -it --entrypoint bash $(IMAGE)

# Run once in a named container, copy the artifacts OUT for inspection, clean up.
.PHONY: eval
eval: build
	-docker rm -f af-eval-run >/dev/null 2>&1
	docker run --name af-eval-run $(IMAGE) run.py
	mkdir -p $(OUT)
	docker cp af-eval-run:/app/deliverables $(OUT)/ 2>/dev/null || true
	docker cp af-eval-run:/app/logs $(OUT)/ 2>/dev/null || true
	docker cp af-eval-run:/app/LEARNINGS.md $(OUT)/ 2>/dev/null || true
	docker cp af-eval-run:/app/dashboard $(OUT)/ 2>/dev/null || true
	docker rm af-eval-run >/dev/null
	@echo ""
	@echo "Artifacts copied to $(OUT) (outside your repo). Open $(OUT)/dashboard/index.html"

.PHONY: clean
clean:
	-docker rm -f af-eval-run >/dev/null 2>&1
	-docker rmi $(IMAGE) >/dev/null 2>&1
	@echo "image removed."

# ---- Local throwaway workspace (no Docker) --------------------------------
# Copies the self-contained factory to a directory OUTSIDE the shared repo so
# other sessions using ~/famtastic are never affected.
.PHONY: workspace
workspace:
	mkdir -p $(DEST)
	tar --exclude=.git --exclude=__pycache__ --exclude=data --exclude=logs \
	    --exclude=deliverables --exclude=eval-output --exclude='*.pyc' \
	    -cf - . | tar -xf - -C $(DEST)
	@echo "Copied to $(DEST). Run it there with:  cd $(DEST) && python3 run.py"
