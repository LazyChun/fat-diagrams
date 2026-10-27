import React from "react";
import { useIntl } from "react-intl";
import styles from "./DiagramCanvas.less";

interface DiagramCanvasProps {
  emptyTextId: string;
}

const DiagramCanvas: React.FC<DiagramCanvasProps> = (props) => {
  const intl = useIntl();
  return (
    <div className={styles.canvas}>
      <div className={styles.hint}>
        {intl.formatMessage({ id: props.emptyTextId })}
      </div>
    </div>
  );
};

export default DiagramCanvas;
