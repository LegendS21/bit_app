import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";

/** Versi ber-tipe dari useDispatch/useSelector — pakai ini, jangan yang polos. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export function useAuth() {
  return useAppSelector((s) => s.auth);
}
