import * as ReactRedux from "react-redux";

import type { Dispatch } from "$/redux";
import type { State } from "$/lib/state";

// <https://github.com/prettier/prettier/issues/12640>
// export const useAppDispatch = ReactRedux.useDispatch<Dispatch>;
export const useDispatch = () => ReactRedux.useDispatch<Dispatch>();

export const useSelector: ReactRedux.TypedUseSelectorHook<State> =
  ReactRedux.useSelector;
