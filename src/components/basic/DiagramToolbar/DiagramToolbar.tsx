import React from "react";
import { Button } from "antd";
import styles from "./DiagramToolbar.less";

interface DiagramToolbarProps {
  addText: string;
  deleteText: string;
  hint: string;
  linkText?: string;
  linking?: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onToggleLink?: () => void;
}

const DiagramToolbar: React.FC<DiagramToolbarProps> = (props) => {
  const {
    addText,
    deleteText,
    hint,
    linkText,
    linking,
    onAdd,
    onDelete,
    onToggleLink,
  } = props;
  return (
    <div
      className={styles.toolbar}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Button size="small" onClick={onAdd}>
        {addText}
      </Button>
      {onToggleLink && linkText ? (
        <Button
          size="small"
          type={linking ? "primary" : "default"}
          onClick={onToggleLink}
        >
          {linkText}
        </Button>
      ) : null}
      <Button size="small" onClick={onDelete}>
        {deleteText}
      </Button>
      <span className={styles.hint}>{hint}</span>
    </div>
  );
};

export default DiagramToolbar;
