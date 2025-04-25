import ImageManagement from "../pages/ImageManagement";
import Dashboard from "../pages/Dashboard";

export enum PageEnum {
  INDEX = "/",
  IMAGEMANAGEMENT = "/imageManagement",
  DASHBOARD = "/dashboard",
}

export const routeConfig = {
  routes: [
    { path: PageEnum.INDEX, element: { Dashboard } },
    { path: PageEnum.IMAGEMANAGEMENT, element: { ImageManagement } },
    { path: PageEnum.DASHBOARD, element: { Dashboard } },
  ],
};
