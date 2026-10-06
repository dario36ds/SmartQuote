import { useState } from "react";

import { validateInput } from "../utils/validation";
import "./ValidatedInput.css";

export default function ValidatedInput({ value, onChange, onBlur, onInvalid, "aria-describedby": describedBy, ...props }) {
  const [touched, setTouched] = useState(false);
  const error = validateInput(value, props);
  const errorId = `${props.id}-error`;
  const visibleError = touched && error;

  return <>
    <input
      {...props}
      value={value}
      ref={(input) => { if (input) input.setCustomValidity(error); }}
      aria-invalid={visibleError ? "true" : undefined}
      aria-describedby={[describedBy, visibleError ? errorId : null].filter(Boolean).join(" ") || undefined}
      onChange={onChange}
      onBlur={(event) => { setTouched(true); onBlur?.(event); }}
      onInvalid={(event) => { setTouched(true); onInvalid?.(event); }}
    />
    {visibleError && <small id={errorId} className="sq-field-error">{error}</small>}
  </>;
}
