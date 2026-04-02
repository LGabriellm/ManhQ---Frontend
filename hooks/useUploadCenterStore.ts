"use client";

import { useMemo, useReducer } from "react";
import type {
  UploadSource,
  UploadWorkflow,
} from "@/types/upload-workflow";

export type UploadPipelineStep =
  | "SOURCE"
  | "SELECT_CONTENT"
  | "SERIES"
  | "INGEST"
  | "REVIEW"
  | "CONFIRM"
  | "PROCESSING";

export type UploadStreamStatus =
  | "idle"
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling";

export interface UploadCenterStreamState {
  status: UploadStreamStatus;
  reconnectAttempts: number;
  eventsReceived: number;
  lastEventType: string | null;
  lastEventAt: string | null;
  usingFallbackPolling: boolean;
  lastError: string | null;
}

export interface UploadCenterState {
  selectedSource: UploadSource;
  activeSessionId: string | null;
  activeStep: UploadPipelineStep;
  stream: UploadCenterStreamState;
}

type UploadCenterAction =
  | { type: "SELECT_SOURCE"; source: UploadSource }
  | { type: "SET_PRE_STAGE_STEP"; step: UploadPipelineStep }
  | { type: "OPEN_SESSION"; sessionId: string; source: UploadSource }
  | { type: "SYNC_WORKFLOW"; workflow: UploadWorkflow | null | undefined }
  | { type: "SYNC_STREAM"; stream: UploadCenterStreamState }
  | { type: "CLEAR_SESSION" };

const INITIAL_STREAM_STATE: UploadCenterStreamState = {
  status: "idle",
  reconnectAttempts: 0,
  eventsReceived: 0,
  lastEventType: null,
  lastEventAt: null,
  usingFallbackPolling: false,
  lastError: null,
};

function resolvePipelineStep(
  workflow: UploadWorkflow | null | undefined,
): UploadPipelineStep {
  if (!workflow) {
    return "SELECT_CONTENT";
  }

  switch (workflow.state) {
    case "ANALYZING":
      return "INGEST";
    case "REVIEW_REQUIRED":
      return "REVIEW";
    case "READY_TO_CONFIRM":
      return workflow.canConfirm ? "CONFIRM" : "REVIEW";
    case "APPROVAL_PENDING":
    case "PROCESSING":
    case "COMPLETED":
    case "PARTIAL_FAILURE":
    case "FAILED":
    case "CANCELED":
    case "EXPIRED":
      return "PROCESSING";
    default:
      return "PROCESSING";
  }
}

function uploadCenterReducer(
  state: UploadCenterState,
  action: UploadCenterAction,
): UploadCenterState {
  switch (action.type) {
    case "SELECT_SOURCE":
      return {
        ...state,
        selectedSource: action.source,
        activeStep: state.activeSessionId ? state.activeStep : "SELECT_CONTENT",
      };
    case "SET_PRE_STAGE_STEP":
      if (state.activeSessionId) {
        return state;
      }
      return {
        ...state,
        activeStep: action.step,
      };
    case "OPEN_SESSION":
      return {
        ...state,
        selectedSource: action.source,
        activeSessionId: action.sessionId,
        activeStep: "INGEST",
        stream: INITIAL_STREAM_STATE,
      };
    case "SYNC_WORKFLOW":
      return {
        ...state,
        activeStep: resolvePipelineStep(action.workflow),
      };
    case "SYNC_STREAM":
      return {
        ...state,
        stream: action.stream,
      };
    case "CLEAR_SESSION":
      return {
        ...state,
        activeSessionId: null,
        activeStep: "SELECT_CONTENT",
        stream: INITIAL_STREAM_STATE,
      };
    default:
      return state;
  }
}

export function useUploadCenterStore(initialSource: UploadSource = "LOCAL") {
  const [state, dispatch] = useReducer(uploadCenterReducer, {
    selectedSource: initialSource,
    activeSessionId: null,
    activeStep: "SOURCE",
    stream: INITIAL_STREAM_STATE,
  });

  const actions = useMemo(
    () => ({
      selectSource(source: UploadSource) {
        dispatch({ type: "SELECT_SOURCE", source });
      },
      setPreStageStep(step: UploadPipelineStep) {
        dispatch({ type: "SET_PRE_STAGE_STEP", step });
      },
      openSession(sessionId: string, source: UploadSource) {
        dispatch({ type: "OPEN_SESSION", sessionId, source });
      },
      syncWorkflow(workflow: UploadWorkflow | null | undefined) {
        dispatch({ type: "SYNC_WORKFLOW", workflow });
      },
      syncStream(stream: UploadCenterStreamState) {
        dispatch({ type: "SYNC_STREAM", stream });
      },
      clearSession() {
        dispatch({ type: "CLEAR_SESSION" });
      },
    }),
    [],
  );

  return { state, actions };
}
