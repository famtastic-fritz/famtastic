#compdef fam-hub

_fam_hub() {
    local context state state_descr line
    typeset -A opt_args

    _arguments -C \
        '1:subcommand:->subcommands' \
        '*::arg:->args' && return

    case $state in
        subcommands)
            local subcommands=(
                'convo:Conversation management'
                'ingest:ChatGPT content ingestion'
                'sync:Bundle creation for ChatGPT'
                'orchestrator:Multi-agent workflows'
                'agent:Direct agent interaction'
                'tts:Text-to-speech generation'
                'promote:File promotion utilities'
            )
            _describe -t subcommands 'fam-hub subcommands' subcommands
            ;;
        args)
            case ${words[2]} in
                convo)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        _arguments '1:action:(reconcile)'
                    elif [[ ${words[3]} == "reconcile" && ${#words[@]} -eq 4 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    fi
                    ;;
                ingest)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    elif [[ ${#words[@]} -eq 4 ]]; then
                        _arguments '1:format:(md json)'
                    fi
                    ;;
                sync)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    fi
                    ;;
                orchestrator)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local types=(
                            'resume:Resume generation workflows'
                            'site:Site building workflows'
                            'job:Job search workflows'
                        )
                        _describe -t types 'orchestrator types' types
                    elif [[ ${#words[@]} -eq 4 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    fi
                    ;;
                agent)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local agents=(
                            'claude:Claude AI agent'
                            'gemini:Gemini AI agent'
                            'codex:Codex code generation'
                        )
                        _describe -t agents 'agent types' agents
                    elif [[ ${#words[@]} -ge 4 ]]; then
                        _files
                    fi
                    ;;
                tts)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    fi
                    ;;
                promote)
                    if [[ ${#words[@]} -eq 3 ]]; then
                        local tags=(${(f)"$(ls ~/.local/share/famtastic/sync/chatgpt/ 2>/dev/null | grep -v "^nonexistent-tag$")"})
                        _describe -t tags 'conversation tags' tags
                    fi
                    ;;
            esac
            ;;
    esac
}

_fam_hub "$@"