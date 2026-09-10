import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sesiHabis } from "../features/auth/authSlice";
import { daftarkanSesiHabis } from "../lib/tokenStore";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

// Interceptor axios tidak boleh mengimpor store (siklus impor), jadi
// hubungannya dipasang lewat callback di tokenStore.
daftarkanSesiHabis(() => store.dispatch(sesiHabis()));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
