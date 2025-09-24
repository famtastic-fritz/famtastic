#!/usr/bin/env bash
# Bash completion for fam-hub CLI

_fam_hub() {
    local cur prev words cword
    _init_completion || return

    local subcommands="convo ingest sync orchestrator agent tts promote"
    local orchestrator_types="resume site job"
    local agent_types="claude gemini codex"

    case "${COMP_CWORD}" in
        1)
            COMPREPLY=($(compgen -W "${subcommands}" -- "${cur}"))
            return
            ;;
        2)
            case "${prev}" in
                convo)
                    COMPREPLY=($(compgen -W "reconcile" -- "${cur}"))
                    ;;
                ingest)
                    # Complete with available conversation tags from sync directory
                    local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                    COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    ;;
                sync)
                    # Complete with available conversation tags
                    local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                    COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    ;;
                orchestrator)
                    COMPREPLY=($(compgen -W "${orchestrator_types}" -- "${cur}"))
                    ;;
                agent)
                    COMPREPLY=($(compgen -W "${agent_types}" -- "${cur}"))
                    ;;
                tts)
                    # Complete with available conversation tags
                    local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                    COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    ;;
                promote)
                    # Complete with available conversation tags
                    local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                    COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    ;;
            esac
            ;;
        3)
            case "${COMP_WORDS[1]}" in
                convo)
                    if [[ "${prev}" == "reconcile" ]]; then
                        # Complete with available conversation tags
                        local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                        COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    fi
                    ;;
                ingest)
                    if [[ "${prev}" != "ingest" ]]; then
                        # Complete with format options
                        COMPREPLY=($(compgen -W "md json" -- "${cur}"))
                    fi
                    ;;
                orchestrator)
                    if [[ "${prev}" == "resume" || "${prev}" == "site" || "${prev}" == "job" ]]; then
                        # Complete with available conversation tags
                        local tags=$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$" || echo "")
                        COMPREPLY=($(compgen -W "${tags}" -- "${cur}"))
                    fi
                    ;;
                agent)
                    # Complete with prompts/args for the selected agent
                    COMPREPLY=($(compgen -f -- "${cur}"))
                    ;;
            esac
            ;;
    esac
}

complete -F _fam_hub fam-hub