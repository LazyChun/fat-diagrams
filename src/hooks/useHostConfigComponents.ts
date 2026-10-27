/**
 * 宿主显示配置公共组件接入层。
 * 宿主通过 sdk.remoteComponents.BlockConfigCommon 暴露折叠区、卡片名称和外框。
 * 这些组件内部基于宿主 redux 自读写。
 */
import { useContext } from "react";
import type React from "react";
import { SdkContext } from "contexts";

export interface HostDisplayCollapseProps {
  title: string;
  defaultExpand?: boolean;
  children?: React.ReactNode;
}

export interface HostBlockNameProps {
  required?: boolean;
}

export interface HostPanelDisplayProps {
  hideTitleAlign?: boolean;
}

export interface HostConfigComponents {
  DisplayCollapse: React.FC<HostDisplayCollapseProps>;
  BlockName: React.FC<HostBlockNameProps>;
  PanelDisplay: React.FC<HostPanelDisplayProps>;
}

const useHostConfigComponents = (): HostConfigComponents | undefined => {
  const { sdk } = useContext(SdkContext);
  const common = sdk?.remoteComponents?.BlockConfigCommon;
  if (!common) {
    return undefined;
  }
  return common as unknown as HostConfigComponents;
};

export default useHostConfigComponents;
