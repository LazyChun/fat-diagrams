/**
 * 流程图显示配置：名称、方向，以及宿主卡片外框。
 */
import React from "react";
import { Select } from "antd";
import { useIntl } from "react-intl";
import { ConfigForm } from "components";
import { useHostBlock, useHostConfigComponents } from "hooks";

const FlowDisplayConfig: React.FC = () => {
  const intl = useIntl();
  const hostComponents = useHostConfigComponents();
  const { currentBlock, updateOption } = useHostBlock();
  if (currentBlock?.type !== "fat-diagrams.flow") {
    return null;
  }
  const flow = (currentBlock.options?.flow || {}) as Block.FlowOptions;
  const directionItem = (
    <ConfigForm.Item
      label={intl.formatMessage({
        id: "fat-diagrams.config.flow.direction",
      })}
    >
      <Select
        style={{ minWidth: 120 }}
        value={flow.direction || "horizontal"}
        onSelect={(value) => updateOption("flow.direction", value)}
        options={[
          {
            value: "horizontal",
            label: intl.formatMessage({
              id: "fat-diagrams.config.flow.direction.horizontal",
            }),
          },
          {
            value: "vertical",
            label: intl.formatMessage({
              id: "fat-diagrams.config.flow.direction.vertical",
            }),
          },
        ]}
      />
    </ConfigForm.Item>
  );
  if (!hostComponents) {
    return <ConfigForm style={{ marginTop: 16 }}>{directionItem}</ConfigForm>;
  }
  const { DisplayCollapse, BlockName, PanelDisplay } = hostComponents;
  return (
    <div>
      <DisplayCollapse
        title={intl.formatMessage({ id: "fat-diagrams.config.style" })}
      >
        <ConfigForm style={{ marginTop: 16 }}>
          <BlockName />
          {directionItem}
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
