/**
 * 宿主卡片编辑状态读写 — 配置面板使用
 *
 * 插件与宿主共享 react-redux 单例，且插件组件渲染在宿主 Provider 树内，
 * 因此可直接 useSelector/useDispatch 访问宿主 store：
 * - 读：state.blockEdit.currentBlock（当前编辑的卡片草稿）
 * - 写：dispatch "blockEdit/onUpdateEditBlock" { path, value }（lodash set 语义）
 */
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

interface HostBlockEditState {
  blockEdit?: {
    currentBlock?: Block.Item;
  };
}

type HostDispatch = (action: { type: string; payload?: unknown }) => void;

const useHostBlock = () => {
  const currentBlock = useSelector(
    (state: HostBlockEditState) => state.blockEdit?.currentBlock,
  );
  const dispatch = useDispatch<HostDispatch>();

  const updateBlock = useCallback(
    (path: string, value: unknown) => {
      dispatch({
        type: "blockEdit/onUpdateEditBlock",
        payload: { path, value },
      });
    },
    [dispatch],
  );

  const updateOption = useCallback(
    (path: string, value: unknown) => {
      updateBlock(`options.${path}`, value);
    },
    [updateBlock],
  );

  return { currentBlock, updateBlock, updateOption };
};

export default useHostBlock;

export { useHostBlock };
