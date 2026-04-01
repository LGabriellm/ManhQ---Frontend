import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorkflowSummary,
  resolveDraftWorkflow,
  resolveSessionWorkflow,
  shouldPollWorkflow,
  workflowNeedsDraft,
} from "../lib/upload-workflow.ts";
import {
  getGoogleDriveReconnectRequirement,
  getUploadErrorMessage,
} from "../lib/uploadErrors.ts";
import type { UploadDraft, UploadSessionDetail } from "../types/upload-workflow.ts";

function makeSession(
  overrides: Partial<UploadSessionDetail> = {},
): UploadSessionDetail {
  return {
    id: "session-1",
    source: "LOCAL",
    status: "READY_FOR_REVIEW",
    workflow: {
      state: "REVIEW_REQUIRED",
      nextAction: "REVIEW_ITEMS",
      canEdit: true,
      canConfirm: false,
      isTerminal: false,
      submitted: false,
      counts: {
        total: 2,
        pendingAnalysis: 0,
        reviewRequired: 2,
        confirmable: 0,
        approvalPending: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        alreadyHandled: 0,
      },
    },
    operational: {
      state: "review_required",
      canCancel: true,
      counts: {
        total: 2,
        active: 0,
        cancelRequested: 0,
        stuck: 0,
        failed: 0,
        completed: 0,
      },
      cancelRequestedAt: null,
      cancelReason: null,
      lastActivityAt: "2026-03-28T10:05:00.000Z",
      heartbeatTimeoutMs: 30_000,
    },
    inputName: "Series Folder",
    metadata: {},
    expiresAt: null,
    createdAt: "2026-03-28T10:00:00.000Z",
    updatedAt: "2026-03-28T10:05:00.000Z",
    submittedAt: null,
    finalizedAt: null,
    cancelRequestedAt: null,
    canceledAt: null,
    counts: {
      total: 2,
      analyzed: 2,
      reviewRequired: 2,
      approvalPending: 0,
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      rejected: 0,
      skipped: 0,
    },
    lastError: null,
    items: [],
    ...overrides,
  };
}

function makeDraft(overrides: Partial<UploadDraft> = {}): UploadDraft {
  return {
    id: "draft-1",
    source: "GOOGLE_DRIVE",
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    sessionStatus: "ANALYZING",
    workflow: {
      state: "ANALYZING",
      nextAction: "POLL_ANALYSIS",
      canEdit: false,
      canConfirm: false,
      isTerminal: false,
      submitted: false,
      counts: {
        total: 2,
        pendingAnalysis: 2,
        reviewRequired: 0,
        confirmable: 0,
        approvalPending: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
        alreadyHandled: 0,
      },
    },
    items: [],
    rejected: [],
    processing: {
      state: "processing",
      totalReceived: 2,
      analyzedCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      startedAt: Date.now(),
    },
    ...overrides,
  };
}

test("resolveSessionWorkflow preserves the backend next action contract", () => {
  const workflow = resolveSessionWorkflow(makeSession());

  assert.equal(workflow.state, "REVIEW_REQUIRED");
  assert.equal(workflow.nextAction, "REVIEW_ITEMS");
  assert.equal(workflow.canEdit, true);
  assert.equal(shouldPollWorkflow(workflow), false);
  assert.equal(workflowNeedsDraft(workflow), true);
  assert.equal(getWorkflowSummary(workflow)?.label, "Revisar itens");
});

test("resolveSessionWorkflow accepts REVIEW_REQUIRED from workflow even with coarse session status", () => {
  const workflow = resolveSessionWorkflow(
    makeSession({
      workflow: {
        ...makeSession().workflow,
        state: "REVIEW_REQUIRED",
      },
    }),
  );

  assert.equal(workflow.state, "REVIEW_REQUIRED");
  assert.equal(workflow.nextAction, "REVIEW_ITEMS");
});

test("resolveDraftWorkflow keeps analysis drafts in poll mode", () => {
  const workflow = resolveDraftWorkflow(makeDraft());

  assert.equal(workflow.state, "ANALYZING");
  assert.equal(workflow.nextAction, "POLL_ANALYSIS");
  assert.equal(workflow.counts.pendingAnalysis, 2);
  assert.equal(shouldPollWorkflow(workflow), true);
});

test("getGoogleDriveReconnectRequirement extracts the backend reconnect payload", () => {
  const requirement = getGoogleDriveReconnectRequirement({
    statusCode: 428,
    authRequired: true,
    errorCode: "GOOGLE_DRIVE_AUTH_REQUIRED",
    googleDrive: {
      authUrl: "https://api.example.com/oauth/google",
      intent: "google_drive_confirm_draft",
      draftId: "draft-1",
    },
  });

  assert.deepEqual(requirement, {
    authUrl: "https://api.example.com/oauth/google",
    callbackMode: null,
    returnUrl: null,
    intent: "google_drive_confirm_draft",
    draftId: "draft-1",
  });
});

test("getUploadErrorMessage explains reconnect-required google drive errors", () => {
  const message = getUploadErrorMessage(
    {
      statusCode: 428,
      authRequired: true,
      errorCode: "GOOGLE_DRIVE_AUTH_REQUIRED",
      googleDrive: {
        authUrl: "https://api.example.com/oauth/google",
      },
    },
    "fallback",
  );

  assert.equal(
    message,
    "A conexão com Google Drive expirou. Reconecte a conta para continuar.",
  );
});
