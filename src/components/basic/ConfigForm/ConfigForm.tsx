/**
 * 配置面板表单布局。标签在左、控件在右，只做布局，不接管表单状态。
 */
import React from "react";
import { Form } from "antd";
import classNames from "classnames";
import styles from "./ConfigForm.less";

interface ConfigFormItemProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const ConfigFormItem: React.FC<ConfigFormItemProps> = (props) => {
  const { label, children, className } = props;
  return (
    <Form.Item
      className={classNames(styles.configFormItem, className)}
      colon={false}
      labelAlign="left"
      label={label ? <div>{label}</div> : undefined}
    >
      {children}
    </Form.Item>
  );
};

const ConfigForm: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> & { Item: typeof ConfigFormItem } = (props) => {
  return (
    <div
      className={classNames(styles.configForm, props.className)}
      style={props.style}
    >
      <Form component="div" layout="horizontal" labelAlign="left">
        {props.children}
      </Form>
    </div>
  );
};

ConfigForm.Item = ConfigFormItem;

export default ConfigForm;
