import Header from "./Header";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

export const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <Header />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 py-4 max-w-7xl mx-auto w-full">
        <Outlet /> 
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
