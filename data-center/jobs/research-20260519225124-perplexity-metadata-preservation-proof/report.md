# Perplexity metadata preservation proof

Status: completed
Source: perplexity
Citations: 5
Search results: 5
Usage: {"prompt_tokens":35,"completion_tokens":802,"total_tokens":837,"search_context_size":"low","cost":{"input_tokens_cost":0.00003,"output_tokens_cost":0.0008,"request_cost":0.005,"total_cost":0.00584}}
Cost: n/a

## Answer excerpt

For **source-grounded synthesis**, an AI research pipeline should preserve metadata at three levels: **source provenance, extraction context, and synthesis traceability**.

## 1) Source provenance
Store enough to prove where each claim came from.

- **Source ID / canonical URL**
- **Title**
- **Author(s) / publisher / repository**
- **Publication or crawl date**
- **Version / snapshot / commit hash** if applicable
- **Access method**: API, web crawl, database export, PDF, etc.
- **License / usage rights**
- **Source type**: paper, dataset, repo, web page, internal doc

Why: this supports reproducibility and citation integrity. Systems like Gemini Deep Research expose **citations, source URLs, and search queries** for this reason [3]. Papers-with-Code/OpenML/Hugging Face integration work also emphasizes preserving source metadata for reproducible pipeline reconstruction [1].

## 2) Retrieval and extraction context
Store how the source was found and what part was used.

- **Query text /
