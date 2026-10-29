/**
 * 关系图显示配置：名称、布局，以及宿主卡片外框。
 */
import React from "react";
import { Select } from "antd";
import { useIntl } from "react-intl";
import { ConfigForm } from "components";
import { useHostBlock, useHostConfigComponents } from "hooks";

const RelationDisplayConfig: React.FC = () => {
  const intl = useIntl();
  const hostComponents = useHostConfigComponents();
  const { currentBlock, updateOption } = useHostBlock();
  if (currentBlock?.type !== "fat-diagrams.relation") {
    return null;
  }
  const relation = (currentBlock.options?.relation || {}) as Block.RelationOptions;
  const layoutItem = (
    <ConfigForm.Item
      label={intl.formatMessage({
        id: "fat-diagrams.config.relation.layout",
      })}
    >
      <Select
        style={{ minWidth: 120 }}
        value={relation.layout || "force"}
        onSelect={(value) => updateOption("relation.layout", value)}
        options={[
          {
            value: "force",
            label: intl.formatMessage({
              id: "fat-diagrams.config.relation.layout.force",
            }),
          },
          {
            value: "hierarchy",
            label: intl.formatMessage({
              id: "fat-diagrams.config.relation.layout.hierarchy",
            }),
          },
        ]}
      />
    </ConfigForm.Item>
  );
  if (!hostComponents) {
    return <ConfigForm style={{ marginTop: 16 }}>{layoutItem}</ConfigForm>;
  }
  const { DisplayCollapse, BlockName, PanelDisplay } = hostComponents;
  return (
    <div>
      <DisplayCollapse
        title={intl.formatMessage({ id: "fat-diagrams.config.style" })}
      >
        <ConfigForm style={{ marginTop: 16 }}>
          <BlockName />
          {layoutItem}
        </ConfigForm>
      </DisplayCollapse>
      <PanelDisplay />
    </div>
  );
};

export default RelationDisplayConfig;
