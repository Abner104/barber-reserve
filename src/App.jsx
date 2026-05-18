import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { useAuthStore } from "./store/authStore";

export default function App() {
  const init = useAuthStore(s => s.init);
  useEffect(() => { init(); }, [init]);
  return <RouterProvider router={router} />;
}
