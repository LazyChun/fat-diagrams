import React from "react";
import type { BlockActionShowParams, BlockTimeContext } from "fat-notes-sdk";
import { DiagramCanvas } from "components";

interface RelationDiagramProps {
  config?: unknown;
  item: Block.Item;
  inConfig?: boolean;
  time?: BlockTimeContext;
  chartId?: string;
  actionsVisible?: boolean;
  onShowActions?: (params: BlockActionShowParams) => void;
}

const RelationDiagram: React.FC<RelationDiagramProps> = () => {
  return <DiagramCanvas emptyTextId="fat-diagrams.relation.empty" />;
};

export default RelationDiagram;
