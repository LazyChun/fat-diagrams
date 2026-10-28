/**
 * 流程图显示配置：名称，以及宿主卡片外框。
 * 图形本身在 draw.io 编辑器里改。
 */
import React from "react";
import { useIntl } from "react-intl";
import { ConfigForm } from "components";
import { useHostBlock, useHostConfigComponents } from "hooks";

const FlowDisplayConfig: React.FC = () => {
  const intl = useIntl();
  const hostComponents = useHostConfigComponents();
  const { currentBlock } = useHostBlock();
  if (currentBlock?.type !== "fat-diagrams.flow" || !hostComponents) {
    return null;
  }
  const { DisplayCollapse, BlockName, PanelDisplay } = hostComponents;
  return (
    <div>
      <DisplayCollapse
        title={intl.formatMessage({ id: "fat-diagrams.config.style" })}
      >
        <ConfigForm style={{ marginTop: 16 }}>
          <BlockName />
        </ConfigForm>
      </DisplayCollapse>
      <DisplayCollapse
        defaultExpand={false}
        title={intl.formatMessage({ id: "fat-diagrams.config.panel" })}
      >
        <PanelDisplay />
      </DisplayCollapse>
    </div>
  );
};

export default FlowDisplayConfig;
