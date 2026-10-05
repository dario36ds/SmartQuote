import { useState } from "react";

import Icon from "./Icon";

export default function PasswordInput({ id, disabled = false, ...props }) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Nascondi password" : "Mostra password";

  return (
    <div className="auth-password-field">
      <input {...props} id={id} type={visible ? "text" : "password"} disabled={disabled} />
      <button
        type="button"
        className="auth-password-toggle"
        aria-label={toggleLabel}
        aria-controls={id}
        title={toggleLabel}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={22} />
      </button>
    </div>
  );
}
