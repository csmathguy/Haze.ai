import { z } from "zod";

export const GitHubPullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z
    .object({
      number: z.number(),
      title: z.string(),
      body: z.string().optional(),
      merged: z.boolean().optional(),
      mergeable_state: z.string().optional(),
      mergeable: z.boolean().optional(),
      head: z
        .object({
          ref: z.string(),
          sha: z.string()
        })
        .optional(),
      base: z
        .object({
          ref: z.string(),
          sha: z.string()
        })
        .optional(),
      html_url: z.string().optional()
    })
    .optional(),
  repository: z
    .object({
      name: z.string(),
      owner: z.object({
        login: z.string()
      })
    })
    .optional()
});

export const GitHubPushPayloadSchema = z.object({
  ref: z.string(),
  repository: z
    .object({
      name: z.string(),
      owner: z.object({
        login: z.string()
      })
    })
    .optional()
});

export const GitHubWorkflowRunPayloadSchema = z.object({
  action: z.string(),
  workflow_run: z
    .object({
      id: z.number(),
      name: z.string(),
      head_branch: z.string().nullable(),
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      status: z.string(),
      html_url: z.string().optional(),
      pull_requests: z
        .array(
          z.object({
            number: z.number()
          })
        )
        .optional()
    })
    .optional(),
  repository: z
    .object({
      name: z.string(),
      owner: z.object({
        login: z.string()
      })
    })
    .optional()
});

export const GitHubCheckSuitePayloadSchema = z.object({
  action: z.string(),
  check_suite: z
    .object({
      id: z.number(),
      head_branch: z.string().nullable(),
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      status: z.string()
    })
    .optional(),
  repository: z
    .object({
      name: z.string(),
      owner: z.object({
        login: z.string()
      })
    })
    .optional()
});

export const GitHubCheckRunPayloadSchema = z.object({
  action: z.string(),
  check_run: z
    .object({
      id: z.number(),
      name: z.string(),
      head_branch: z.string().nullable(),
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      status: z.string(),
      html_url: z.string().optional(),
      pull_requests: z
        .array(
          z.object({
            number: z.number()
          })
        )
        .optional()
    })
    .optional(),
  repository: z
    .object({
      name: z.string(),
      owner: z.object({
        login: z.string()
      })
    })
    .optional()
});
