type HostDispatch = (action: { type: string; payload?: unknown }) => void;

interface HostResp<T> {
  isOk?: boolean;
  data?: T;
}

interface HostDollar {
  post?: <T>(url: string, params?: object) => Promise<HostResp<T>>;
}

interface DirtyState {
  board?: {
    dirtyBoardIds?: string[];
  };
}

// 配置抽屉里写入编辑草稿；画布上直接落库，避免把已经脏的看板误标成已保存
export const saveBlockOptions = async (
  dispatch: HostDispatch,
  getState: () => unknown,
  item: Block.Item,
  inConfig: boolean | undefined,
  options: Block.Item["options"],
): Promise<void> => {
  const next: Block.Item = { ...item, options };
  if (inConfig) {
    dispatch({
      type: "blockEdit/onUpdateEditBlock",
      payload: { path: "options", value: options },
    });
    return;
  }
  if (!item.id || !item.boardId) {
    return;
  }
  const dirtyBefore = !!(getState() as DirtyState).board?.dirtyBoardIds?.includes(
    item.boardId,
  );
  dispatch({ type: "board/onUpdateBlock", payload: next });
  const dollar = (window as Window & { $?: HostDollar | null }).$;
  if (!dollar?.post) {
    return;
  }
  try {
    const resp = await dollar.post<Block.Item>("app/block/editBlock", next);
    if (resp?.isOk && resp.data) {
      dispatch({ type: "board/onUpdateBlock", payload: resp.data });
      if (!dirtyBefore) {
        dispatch({
          type: "board/onAcceptBoardSnapshot",
          payload: item.boardId,
        });
      }
    }
  } catch (error) {
    console.warn("[fat-diagrams] save block failed", error);
  }
};
