import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildCommentBody, upsertReviewComment } from "./comment";
import { DEFAULT_SYSTEM_PROMPT } from "./constants";
import { chatCompletion } from "./deepseek";

function parseVerdict(markdown: string): "APPROVE" | "REQUEST_CHANGES" | "COMMENT" {
  const lower = markdown.toLowerCase();
  if (/\bblocked\b/.test(lower) || /\brequest changes\b/.test(lower)) {
    return "REQUEST_CHANGES";
  }
  if (/\blgtm\b/.test(lower) || /\blooks good\b/.test(lower)) {
    return "APPROVE";
  }
  return "COMMENT";
}

export async function run(): Promise<void> {
  const token =
    core.getInput("github-token") || process.env.GITHUB_TOKEN || "";
  const apiKey =
    core.getInput("deepseek-api-key") ||
    process.env.DEEPSEEK_API_KEY ||
    "";
  const model = core.getInput("model") || "deepseek-chat";
  const baseUrl = core.getInput("base-url") || "https://api.deepseek.com";
  const advisory = (core.getInput("advisory") || "true").toLowerCase() !== "false";
  const maxDiffChars = Number(core.getInput("max-diff-chars") || "120000");
  const systemPromptOverride = core.getInput("system-prompt");

  if (!apiKey) {
    core.setFailed("deepseek-api-key input (or DEEPSEEK_API_KEY) is required");
    return;
  }
  if (!token) {
    core.setFailed("github-token is required");
    return;
  }

  const octokit = github.getOctokit(token);
  const ctx = github.context;

  if (ctx.eventName !== "pull_request" && ctx.eventName !== "pull_request_target") {
    core.info(`Skipping: unsupported event ${ctx.eventName}`);
    return;
  }

  const pull = ctx.payload.pull_request;
  if (!pull) {
    core.setFailed("pull_request payload missing");
    return;
  }

  const owner = ctx.repo.owner;
  const repo = ctx.repo.repo;
  const pullNumber = pull.number;

  core.info(`Reviewing PR #${pullNumber}: ${pull.title}`);

  const diffRes = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: "diff" },
  });
  const diff = String(diffRes.data ?? "");
  if (maxDiffChars > 0 && diff.length > maxDiffChars) {
    core.warning(
      `Diff length ${diff.length} exceeds max-diff-chars ${maxDiffChars}; skipping review.`,
    );
    return;
  }

  const systemPrompt = systemPromptOverride.trim() || DEFAULT_SYSTEM_PROMPT;
  const userContent = [
    `Repository: ${owner}/${repo}`,
    `PR #${pullNumber}: ${pull.title}`,
    pull.body ? `Description:\n${pull.body}` : "Description: (empty)",
    `Base: ${pull.base?.ref} ← Head: ${pull.head?.ref}`,
    "",
    "Unified diff:",
    diff || "(empty diff)",
  ].join("\n");

  const reviewMarkdown = await chatCompletion({
    baseUrl,
    apiKey,
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const commentBody = buildCommentBody(reviewMarkdown);
  await upsertReviewComment({
    octokit,
    owner,
    repo,
    issueNumber: pullNumber,
    body: commentBody,
  });
  core.info("Updated PR review comment");

  if (!advisory) {
    const event = parseVerdict(reviewMarkdown);
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event,
      body: `${reviewMarkdown.slice(0, 60000)}`,
    });
    core.info(`Submitted formal review: ${event}`);
  }
}

if (require.main === module) {
  run().catch((err) => {
    core.setFailed(err instanceof Error ? err.message : String(err));
  });
}

export { buildCommentBody, parseVerdict };
