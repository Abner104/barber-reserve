import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1E1E1E",
            border: "1px solid #2A2A2A",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
          },
          classNames: {
            success: "toast-success",
            error:   "toast-error",
          },
        }}
        icons={{
          success: "✅",
          error:   "❌",
          warning: "⚠️",
          info:    "ℹ️",
          loading: "⏳",
        }}
      />
    </QueryClientProvider>
  );
}
