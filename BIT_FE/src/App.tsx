import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./routes";
import { muatSesi } from "./features/auth/authSlice";
import { useAppDispatch } from "./store/hooks";

export default function App() {
  const dispatch = useAppDispatch();

  // Access token hanya hidup di memori, jadi setiap kali halaman dimuat ulang
  // sesi dipulihkan dari cookie refresh yang HttpOnly.
  useEffect(() => {
    dispatch(muatSesi());
  }, [dispatch]);

  return <RouterProvider router={router} />;
}
