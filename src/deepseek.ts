import * as core from "@actions/core";

export type ChatMessage = { role: "system" | "user"; content: string };

export async function chatCompletion(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}): Promise<string> {
  const url = `${options.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const body = {
    model: options.model,
    messages: options.messages,
    temperature: 0.2,
  };

  core.info(`Calling DeepSeek model ${options.model} at ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 500)}`);
  }

  let data: {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(`DeepSeek API returned non-JSON: ${text.slice(0, 200)}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("DeepSeek API returned empty completion");
  }
  return content;
}
