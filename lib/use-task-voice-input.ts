"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Web Speech API → append phrases to the task field. Chrome / Edge / Safari;
 * Firefox usually has no support.
 */
function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function useTaskVoiceInput(onFinalTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(
    () => () => {},
    speechRecognitionSupported,
    () => false,
  );
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    setVoiceError(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setVoiceError("Voice input isn’t available in this browser. Try Chrome or Safari.");
      return;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        resultIndex: number;
        results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
      };
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const t = r[0].transcript.trim();
          if (t) onFinalTranscript(t);
        }
      }
    };

    rec.onerror = (ev: Event) => {
      const err = (ev as unknown as { error?: string }).error;
      if (err === "aborted" || err === "no-speech") return;
      const msg =
        err === "not-allowed"
          ? "Microphone permission was blocked. Allow the mic for this site and try again."
          : err === "network"
            ? "Speech recognition had a network error. Check your connection."
            : `Voice: ${err ?? "unknown error"}`;
      setVoiceError(msg);
      setListening(false);
      recRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setVoiceError("Couldn’t start voice input.");
      recRef.current = null;
    }
  }, [onFinalTranscript]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { listening, supported, voiceError, start, stop, toggle, clearVoiceError: () => setVoiceError(null) };
}
