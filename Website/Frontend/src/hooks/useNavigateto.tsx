import { useNavigate, NavigateOptions } from "react-router-dom";
import { PageEnum } from './page.enum'

type PageType = PageEnum;

const useNavigateto = () => {
    const navigate = useNavigate();
    const navigateTo = (path: PageType, options: NavigateOptions = {}) => {
        navigate(path, options);
      };

      const navigatetoDashboard = () => {
        navigateTo(PageEnum.DASHBOARD, { replace: true });
      };
      const navigatetoImages = () => {
        navigateTo(PageEnum.IMAGEMANAGEMENT, { replace: true });
      };
  return {
    navigatetoDashboard,
    navigatetoImages,
  };
};

export default useNavigateto;
