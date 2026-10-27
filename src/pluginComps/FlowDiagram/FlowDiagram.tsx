import React from "react";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import { DiagramCanvas } from "components";

interface FlowDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

const FlowDiagram: React.FC<FlowDiagramProps> = () => {
  return <DiagramCanvas emptyTextId="fat-diagrams.flow.empty" />;
};

export default FlowDiagram;
