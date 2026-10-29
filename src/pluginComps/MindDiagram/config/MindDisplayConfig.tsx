/**
 * 思维导图显示配置：名称、结构、主题，以及宿主卡片外框。
 */
import React from "react";
import { Select } from "antd";
import { useIntl } from "react-intl";
import { ConfigForm } from "components";
import { useHostBlock, useHostConfigComponents } from "hooks";
import {
  DEFAULT_MIND_LAYOUT,
  DEFAULT_MIND_THEME,
  MIND_LAYOUTS,
  MIND_THEMES,
} from "../../../diagram/mindData";

const MindDisplayConfig: React.FC = () => {
  const intl = useIntl();
  const hostComponents = useHostConfigComponents();
  const { currentBlock, updateOption } = useHostBlock();
  if (currentBlock?.type !== "fat-diagrams.mind") {
    return null;
  }
  const mind = (currentBlock.options?.mind || {}) as Block.MindOptions;
  const layoutOptions = MIND_LAYOUTS.map((value) => ({
    value,
    label: intl.formatMessage({ id: `fat-diagrams.mind.layout.${value}` }),
  }));
  const themeOptions = MIND_THEMES.map((value) => ({
    value,
    label: intl.formatMessage({ id: `fat-diagrams.mind.theme.${value}` }),
  }));
  const fields = (
    <>
      <ConfigForm.Item
        label={intl.formatMessage({ id: "fat-diagrams.config.mind.layout" })}
      >
        <Select
          style={{ minWidth: 140 }}
          value={mind.layout || DEFAULT_MIND_LAYOUT}
          onSelect={(value) => updateOption("mind.layout", value)}
          options={layoutOptions}
        />
      </ConfigForm.Item>
      <ConfigForm.Item
        label={intl.formatMessage({ id: "fat-diagrams.config.mind.theme" })}
      >
        <Select
          style={{ minWidth: 140 }}
          value={mind.theme || DEFAULT_MIND_THEME}
          onSelect={(value) => updateOption("mind.theme", value)}
          options={themeOptions}
        />
      </ConfigForm.Item>
    </>
  );
  if (!hostComponents) {
    return <ConfigForm style={{ marginTop: 16 }}>{fields}</ConfigForm>;
  }
  const { DisplayCollapse, BlockName, PanelDisplay } = hostComponents;
  return (
    <div>
      <DisplayCollapse
        title={intl.formatMessage({ id: "fat-diagrams.config.style" })}
      >
        <ConfigForm style={{ marginTop: 16 }}>
          <BlockName />
          {fields}
        </ConfigForm>
      </DisplayCollapse>
      <PanelDisplay />
    </div>
  );
};

export default MindDisplayConfig;
