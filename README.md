# deepseek-pr-review

GitHub Action that calls the [DeepSeek](https://www.deepseek.com/) OpenAI-compatible chat API to review pull request diffs and post an **advisory** comment on the PR.

Each run upserts a single comment identified by the HTML marker `<!-- deepseek-pr-review:v1 -->`.

## Quick start

1. Add a repository secret `DEEPSEEK_API_KEY`.
2. Copy [`.github/workflows/example-deepseek-pr-review.yml`](examples/workflow.yml) into your repo (or use the snippet below).

```yaml
name: DeepSeek PR Review
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: bantianyue/deepseek-pr-review@v1
        with:
          deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `deepseek-api-key` | yes | — | DeepSeek API key |
| `github-token` | no | `${{ github.token }}` | Token with `pull-requests: write` |
| `model` | no | `deepseek-chat` | Model name |
| `base-url` | no | `https://api.deepseek.com` | API base URL |
| `advisory` | no | `true` | Comment only; set `false` to also submit a formal PR review |
| `max-diff-chars` | no | `120000` | Skip when diff is larger (`0` = no limit) |
| `system-prompt` | no | (built-in) | Override review system prompt |

## Advisory vs formal review

By default (`advisory: true`) the action **only** updates the marker comment. This avoids blocking merges on AI output.

Set `advisory: false` to additionally create a GitHub pull request review event (`APPROVE`, `COMMENT`, or `REQUEST_CHANGES`) inferred from the model’s **Verdict** section.

## Development

```bash
npm ci
npm run lint
npm test
npm run build
```

The compiled entrypoint committed for releases is `dist/index.js` (built with `@vercel/ncc`).

## License

MIT — see [LICENSE](LICENSE).
