import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Models from "./pages/Models";
import ViewModel from "./pages/ViewModel";
import Categories from "./pages/Categories";
import Chipsets from "./pages/Chipsets";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route path="/models" element={<RequireAuth><Layout><Models /></Layout></RequireAuth>} />
            <Route path="/models/:modelNumber" element={<RequireAuth><Layout><ViewModel /></Layout></RequireAuth>} />
            <Route path="/categories" element={<RequireAuth><Layout><Categories /></Layout></RequireAuth>} />
            <Route path="/chipsets" element={<RequireAuth><Layout><Chipsets /></Layout></RequireAuth>} />
            <Route path="/search" element={<RequireAuth><Layout><Search /></Layout></RequireAuth>} />
            <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

export default App;
