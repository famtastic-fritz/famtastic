# Swarm worker A research synthesis structure

Status: completed
Source: perplexity
Citations: 9
Search results: 9
Usage: {"prompt_tokens":40,"completion_tokens":568,"total_tokens":608,"search_context_size":"low","cost":{"input_tokens_cost":0.00004,"output_tokens_cost":0.00057,"request_cost":0.005,"total_cost":0.00561}}
Cost: n/a

## Answer excerpt

For **bounded, cited research reports**, use a **hybrid orchestrator-worker swarm**, not a fully flat swarm.

## Recommended structure
1. **Lead orchestrator**
   - Breaks the question into 3–6 scoped subquestions
   - Assigns each subtask to a specialist
   - Sets output format, citation requirements, and time/call budget

2. **Specialist research agents**
   - Each handles one narrow lane:
     - market/industry scan
     - technical evidence
     - competitor/benchmark review
     - risks/limitations
     - user-impact implications
   - They work mostly independently and return structured notes with sources

3. **Verifier/editor agent**
   - Deduplicates claims
   - Checks citation quality
   - Flags weak or uncited assertions
   - Produces the final synthesized report

## Why this works
- **Efficient for bounded research**: parallel exploration reduces time-to-answer.
- **Better citation hygiene**: one agent can enforce “claim → source” mapping.
- **Avoids swarm chaos**: pure peer-
