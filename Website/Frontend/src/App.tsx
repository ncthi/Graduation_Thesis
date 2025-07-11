import { Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ImageManagement from "./pages/ImageManagement";
import { PageEnum } from "./hooks/page.enum";
import { Layout } from "../src/pages/Layout"; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={PageEnum.IMAGEMANAGEMENT} replace />} />
      <Route element={<Layout />}>
        <Route path={PageEnum.IMAGEMANAGEMENT} element={<ImageManagement />} />
        <Route path={PageEnum.DASHBOARD} element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
