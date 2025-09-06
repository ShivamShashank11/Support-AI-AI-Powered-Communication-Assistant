import React, { useState } from "react";
import "./DraftEditor.css"; // custom styles

export default function DraftEditor({ initial, onSave, onSend }) {
  const [text, setText] = useState(initial || "");

  return (
    <div className="draft-editor">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="draft-textarea"
        placeholder="Write or edit your reply here..."
      />
      <div className="draft-actions">
        <button onClick={() => onSave(text)} className="btn">
          Save Draft
        </button>
        <button onClick={() => onSend(text)} className="btn btn-primary">
          Send
        </button>
      </div>
    </div>
  );
}
