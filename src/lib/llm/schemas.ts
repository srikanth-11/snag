// JSON shapes the model is asked to return. Embedded into prompts (we rely on
// responseMimeType=json + JSON repair rather than provider-specific schema
// formats, which vary and fail hard when malformed).

export const ACTION_SHAPE = `{
  "kind": "click" | "type" | "navigate" | "scroll" | "back" | "stop",
  "target": string,   // accessible name / visible text / url the action acts on
  "value": string,    // text to type, or url to navigate to (omit otherwise)
  "reason": string    // one short sentence: why this action
}`;

export const SOFT_FINDINGS_SHAPE = `{
  "findings": [
    { "title": string, "detail": string, "severity": "critical"|"high"|"medium"|"low" }
  ]
}`;

export const VERDICT_SHAPE = `{
  "real": boolean,     // is this a genuine user-facing bug?
  "severity": "critical" | "high" | "medium" | "low",
  "reason": string
}`;
